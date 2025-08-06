#ifndef BDC6_HS_VALUE_LIMITS_STRUCT_H
#define BDC6_HS_VALUE_LIMITS_STRUCT_H

#include <stdint.h>

typedef struct {
    uint64_t raw_data;     // Raw CAN data payload
    uint32_t can_id;       // CAN ID (e.g., 0x338)
    uint16_t interval_ms;  // Interval in ms (0 = one-shot)
    uint8_t cyclic;        // 1 = enable periodic sending
    uint8_t immediate;     // 1 = trigger immediate sending
} BDC6_HS_Value_Limits_SHM;

#endif
