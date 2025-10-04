// can_sender_v2.c — broker + sender (master + request per message)
#define _GNU_SOURCE
#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include <stdarg.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <time.h>
#include <errno.h>
#include <linux/can.h>
#include <linux/can/raw.h>
#include <sys/socket.h>
#include <net/if.h>
#include <sys/ioctl.h>
#include <stdlib.h>
#include <grp.h>

#pragma pack(push,1)
typedef struct {
    uint8_t  data[8];     // 0..7
    uint32_t can_id;      // 8..11 LE
    uint16_t interval_ms; // 12..13 LE
    uint8_t  cyclic;      // 14
    uint8_t  immediate;   // 15
} shm_msg_t;
#pragma pack(pop)

typedef struct {
    const char *shm_name;  // e.g. "/SM_BDC6_State_Request"
    const char *req_name;  // e.g. "/SM_BDC6_State_Request.req_nr"
    int         fd_state, fd_req;
    shm_msg_t  *state, *req;
    uint64_t    next_send_ns;
} entry_t;

static const char *g_ifname    = "can0";
static const char *g_prefix    = "";         // optionaler Prefix vor dem SHM-Namen
static const char *g_shm_dir   = "/dev/shm"; // SHM-Verzeichnis
static const char *g_shm_group = NULL;       // optional: chgrp auf diese Gruppe
static int         g_log_debug = 0;

// ---- Zeit-Helpers ----
static inline uint64_t mono_ns(void){
    struct timespec ts; clock_gettime(CLOCK_MONOTONIC, &ts);
    return (uint64_t)ts.tv_sec*1000000000ull + (uint64_t)ts.tv_nsec;
}
static inline void sleep_ns(uint64_t ns){
    struct timespec ts = { .tv_sec = (time_t)(ns/1000000000ull),
                           .tv_nsec = (long)(ns%1000000000ull) };
    clock_nanosleep(CLOCK_MONOTONIC, 0, &ts, NULL);
}
static void dbg(const char* fmt, ...){
    if (!g_log_debug) return;
    va_list ap; va_start(ap, fmt);
    vfprintf(stderr, fmt, ap);
    fputc('\n', stderr);
    va_end(ap);
}

// ---- SHM-Map mit harten Rechten (0660) + optional chgrp ----
static bool map_file_rw(const char* path, int* fd_out, void** mem_out, size_t sz){
    mode_t old = umask(0007); // sorgt für 0660 bei O_CREAT|0666
    int fd = open(path, O_RDWR | O_CREAT, 0666);
    int open_err = errno;
    umask(old);
    if (fd < 0) { errno=open_err; perror("open(shm)"); return false; }

    if (ftruncate(fd, sz) < 0) { perror("ftruncate(shm)"); close(fd); return false; }

    // Rechte absichern, unabhängig von Dienst-UMask
    if (fchmod(fd, 0660) < 0) perror("fchmod(shm 0660)");

    if (g_shm_group && *g_shm_group){
        struct group *gr = getgrnam(g_shm_group);
        if (gr && fchown(fd, (uid_t)-1, gr->gr_gid) < 0) perror("fchown(shm group)");
    }

    void* mem = mmap(NULL, sz, PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
    if (mem == MAP_FAILED) { perror("mmap(shm)"); close(fd); return false; }

    *fd_out = fd; *mem_out = mem; return true;
}

static bool open_entry(entry_t* e){
    char st[512], rq[512];
    // führenden '/' in den Namen entfernen und Prefix (falls gesetzt) voranstellen
    const char *name_state = (e->shm_name[0]=='/') ? e->shm_name+1 : e->shm_name;
    const char *name_req   = (e->req_name[0]=='/') ? e->req_name+1 : e->req_name;

    snprintf(st, sizeof st, "%s/%s%s", g_shm_dir, g_prefix, name_state);
    snprintf(rq, sizeof rq, "%s/%s%s", g_shm_dir, g_prefix, name_req);

    dbg("map state: %s", st);
    dbg("map req  : %s", rq);

    if (!map_file_rw(st, &e->fd_state, (void**)&e->state, sizeof(shm_msg_t))) return false;
    if (!map_file_rw(rq, &e->fd_req,   (void**)&e->req,   sizeof(shm_msg_t)))  return false;
    return true;
}

static void close_entry(entry_t* e){
    if (e->state) munmap(e->state, sizeof(shm_msg_t));
    if (e->req)   munmap(e->req,   sizeof(shm_msg_t));
    if (e->fd_state>=0) close(e->fd_state);
    if (e->fd_req>=0)   close(e->fd_req);
    e->state=NULL; e->req=NULL; e->fd_state=e->fd_req=-1;
}

// ---- CAN öffnen ----
static int open_can(const char* ifname){
    int s = socket(PF_CAN, SOCK_RAW, CAN_RAW);
    if (s < 0) { perror("socket PF_CAN"); return -1; }
    struct ifreq ifr; memset(&ifr, 0, sizeof ifr);
    strncpy(ifr.ifr_name, ifname, IFNAMSIZ-1);
    if (ioctl(s, SIOCGIFINDEX, &ifr) < 0){ perror("ioctl SIOCGIFINDEX"); close(s); return -1; }
    struct sockaddr_can addr = { .can_family = AF_CAN, .can_ifindex = ifr.ifr_ifindex };
    if (bind(s, (struct sockaddr*)&addr, sizeof(addr)) < 0){ perror("bind CAN"); close(s); return -1; }
    return s;
}

// ---- Merge: request -> state (RMW in einem Thread) ----
static void apply_request(entry_t* e){
    shm_msg_t r = *e->req;
    bool have_any =
        r.can_id || r.cyclic || r.interval_ms || r.immediate ||
        memcmp(r.data, (uint8_t[8]){0}, 8) != 0;

    if (!have_any) return;

    shm_msg_t s = *e->state;

    // payload: last-writer-wins (auch 0 erlaubt)
    memcpy(s.data, r.data, 8);

    // CAN-ID nur übernehmen, wenn != 0
    if (r.can_id) s.can_id = r.can_id;

    // Timing direkt übernehmen (auch 0 möglich)
    s.cyclic      = r.cyclic;
    s.interval_ms = r.interval_ms;

    // One-shot: OR (mehrere Writer können triggern)
    s.immediate  |= r.immediate;

    *e->state = s;

    // Request leeren (Level-Semantik)
    memset(e->req, 0, sizeof(shm_msg_t));
}

// ---- Messages-Tabelle ----
static entry_t E[] = {
    { .shm_name="/SM_BDC6_State_Request",    .req_name="/SM_BDC6_State_Request.req_nr",
      .fd_state=-1, .fd_req=-1, .state=NULL, .req=NULL, .next_send_ns=0 },

    { .shm_name="/SM_BDC6_HS_Value_Limits",  .req_name="/SM_BDC6_HS_Value_Limits.req_nr",
      .fd_state=-1, .fd_req=-1, .state=NULL, .req=NULL, .next_send_ns=0 },

    { .shm_name="/SM_BDC6_LS_Value_Limits",  .req_name="/SM_BDC6_LS_Value_Limits.req_nr",
      .fd_state=-1, .fd_req=-1, .state=NULL, .req=NULL, .next_send_ns=0 },
};
static const size_t N = sizeof(E)/sizeof(E[0]);

static void usage(const char* argv0){
    fprintf(stderr,
        "Usage: %s [--ifname canX] [--prefix STR] [--shm-dir /dev/shm] [--shm-group GROUP] [--log debug|info]\n",
        argv0);
}

int main(int argc, char** argv){
    // Argumente parsen (keine Legacy-Positionsargumente)
    for (int i=1; i<argc; ++i){
        if (!strcmp(argv[i],"--ifname") && i+1<argc)    { g_ifname = argv[++i]; continue; }
        if (!strcmp(argv[i],"--prefix") && i+1<argc)    { g_prefix = argv[++i]; continue; }
        if (!strcmp(argv[i],"--shm-dir") && i+1<argc)   { g_shm_dir= argv[++i]; continue; }
        if (!strcmp(argv[i],"--shm-group") && i+1<argc) { g_shm_group= argv[++i]; continue; }
        if (!strcmp(argv[i],"--log") && i+1<argc){
            const char* v = argv[++i];
            g_log_debug = (!strcmp(v,"debug")) ? 1 : 0;
            continue;
        }
        if (!strcmp(argv[i],"-h") || !strcmp(argv[i],"--help")) { usage(argv[0]); return 0; }
        fprintf(stderr, "Unknown arg: %s\n", argv[i]); usage(argv[0]); return 2;
    }

    // SHMs mappen/anlegen (0660, ggf. chgrp)
    for (size_t i=0; i<N; ++i){
        if (!open_entry(&E[i])) return 1;
        E[i].next_send_ns = 0;
    }

    int can = open_can(g_ifname);
    if (can < 0) { for (size_t i=0;i<N;i++) close_entry(&E[i]); return 1; }

    const uint64_t tick_ns = 1000000ull; // 1 ms
    uint64_t last = mono_ns();

    fprintf(stderr, "can_sender_v2 starting: if=%s, shm_dir=%s, prefix=%s, group=%s\n",
            g_ifname, g_shm_dir, g_prefix, g_shm_group?g_shm_group:"(none)");

    while (1){
        uint64_t now = mono_ns();
        if (now - last < tick_ns){
            sleep_ns(tick_ns - (now - last));
            now = mono_ns();
        }
        last = now;

        for (size_t i=0; i<N; ++i){
            apply_request(&E[i]);

            shm_msg_t s = *E[i].state;

            if (s.immediate){
                struct can_frame f = {0};
                f.can_id  = s.can_id;
                f.can_dlc = 8;
                memcpy(f.data, s.data, 8);
                ssize_t w = write(can, &f, sizeof f);
                if (w < 0 && g_log_debug) perror("write(can, immediate)");
                E[i].state->immediate = 0; // ack
            }

            if (s.cyclic && s.interval_ms){
                if (now >= E[i].next_send_ns){
                    struct can_frame f = {0};
                    f.can_id  = s.can_id;
                    f.can_dlc = 8;
                    memcpy(f.data, s.data, 8);
                    ssize_t w = write(can, &f, sizeof f);
                    if (w < 0 && g_log_debug) perror("write(can, cyclic)");
                    E[i].next_send_ns = now + (uint64_t)s.interval_ms * 1000000ull;
                }
            } else {
                E[i].next_send_ns = now; // sofort bereit, wenn später aktiviert
            }
        }
    }

    // nicht erreicht
    for (size_t i=0;i<N;i++) close_entry(&E[i]);
    close(can);
    return 0;
}
