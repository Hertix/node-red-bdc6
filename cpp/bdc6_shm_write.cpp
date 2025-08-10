#include <iostream>
#include <string>
#include <cstring>
#include <fcntl.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>
#include "../shm/bdc6_shm.h"
#include <nlohmann/json.hpp>
using json = nlohmann::json;

int main() {
  std::string in, line;
  while (std::getline(std::cin, line)) in += line;
  if (in.empty()) { std::cerr << "No JSON payload on stdin\n"; return 1; }

  json j;
  try { j = json::parse(in); }
  catch (...) { std::cerr << "Invalid JSON\n"; return 1; }

  std::string shm_name = j.value("shm_name", "");
  if (shm_name.empty()) { std::cerr << "Missing shm_name\n"; return 1; }

  bdc6_shm_frame_t frame{};
  std::string raw_hex = j.value("raw_hex", "0000000000000000");
  if (raw_hex.size() != 16) { std::cerr << "raw_hex must be 16 hex chars\n"; return 1; }
  for (int i=0;i<8;i++) {
    uint8_t val = static_cast<uint8_t>(std::stoul(raw_hex.substr(i*2,2), nullptr, 16));
    reinterpret_cast<uint8_t*>(&frame.raw_data)[i] = val;
  }

  frame.can_id = j.value("can_id", 0u);
  frame.interval_ms = static_cast<uint16_t>(j.value("interval_ms", 0));
  frame.cyclic = static_cast<uint8_t>(j.value("cyclic", 0));
  frame.immediate = static_cast<uint8_t>(j.value("immediate", 0));

  int fd = shm_open(shm_name.c_str(), O_CREAT|O_RDWR, 0660);
  if (fd < 0) { perror("shm_open"); return 1; }
  if (ftruncate(fd, sizeof(bdc6_shm_frame_t)) != 0) { perror("ftruncate"); return 1; }

  void* mem = mmap(nullptr, sizeof(bdc6_shm_frame_t), PROT_READ|PROT_WRITE, MAP_SHARED, fd, 0);
  if (mem == MAP_FAILED) { perror("mmap"); return 1; }

  std::memcpy(mem, &frame, sizeof(frame));
  msync(mem, sizeof(frame), MS_SYNC);

  munmap(mem, sizeof(frame));
  close(fd);
  std::cout << "Wrote SHM " << shm_name << " (can_id=0x" << std::hex << frame.can_id << ")\n";
  return 0;
}
