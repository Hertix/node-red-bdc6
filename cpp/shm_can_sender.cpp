#include <iostream>
#include <chrono>
#include <thread>
#include <vector>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>
#include "../shm/bdc6_shm.h"

static const char* SHM_LIST[] = { "/SM_BDC6_HS_Value_Limits" };
static constexpr size_t SHM_COUNT = sizeof(SHM_LIST)/sizeof(SHM_LIST[0]);

int main() {
  std::vector<int> fds(SHM_COUNT, -1);
  std::vector<bdc6_shm_frame_t*> frames(SHM_COUNT, nullptr);

  for (size_t i=0;i<SHM_COUNT;i++){
    int fd = shm_open(SHM_LIST[i], O_CREAT|O_RDWR, 0660);
    if (fd < 0) { perror("shm_open"); return 1; }
    if (ftruncate(fd, sizeof(bdc6_shm_frame_t)) != 0) { perror("ftruncate"); return 1; }
    void* mem = mmap(nullptr, sizeof(bdc6_shm_frame_t), PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
    if (mem == MAP_FAILED) { perror("mmap"); return 1; }
    fds[i] = fd;
    frames[i] = reinterpret_cast<bdc6_shm_frame_t*>(mem);
  }

  std::vector<uint16_t> counters(SHM_COUNT, 0);

  while (true) {
    std::this_thread::sleep_for(std::chrono::milliseconds(1));
    for (size_t i=0;i<SHM_COUNT;i++){
      auto* f = frames[i];
      if (!f) continue;

      if (f->immediate) {
        std::cout << "[IMM] can_id=0x" << std::hex << f->can_id
                  << " data=0x" << std::hex << f->raw_data << std::dec << "\n";
        f->immediate = 0;
      }
      if (f->cyclic && f->interval_ms > 0) {
        if (counters[i] == 0) {
          std::cout << "[CYC] can_id=0x" << std::hex << f->can_id
                    << " data=0x" << std::hex << f->raw_data << std::dec << "\n";
          counters[i] = f->interval_ms;
        } else {
          counters[i]--;
        }
      }
    }
  }
  return 0;
}
