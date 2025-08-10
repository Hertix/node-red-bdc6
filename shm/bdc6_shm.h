#pragma once
#include <cstdint>
#pragma pack(push,1)
struct bdc6_shm_frame_t {
  uint64_t raw_data;     // 8 bytes CAN payload
  uint32_t can_id;       // 4 bytes
  uint16_t interval_ms;  // 2 bytes (0 => no cyclic)
  uint8_t  cyclic;       // 1 byte (0/1)
  uint8_t  immediate;    // 1 byte (0/1)
};
#pragma pack(pop)
