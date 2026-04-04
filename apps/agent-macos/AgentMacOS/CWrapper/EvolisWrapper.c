//
//  EvolisWrapper.c
//  AgentMacOS
//
//  C wrapper functions for variadic SDK functions that Swift can't call directly
//

#include "evolis/evolis.h"
#include <stdlib.h>

// Wrapper for evolis_get_devices which is variadic
// This version gets ALL printers (no model filter)
int evolis_get_all_devices(evolis_device_t** devices) {
    // Pass 0 as terminator to get all devices
    return evolis_get_devices(devices, 0);
}

// Wrapper to get devices of a specific model
int evolis_get_devices_by_model(evolis_device_t** devices, int model) {
    return evolis_get_devices(devices, model, 0);
}
