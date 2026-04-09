//
//  EvolisWrapper.h
//  AgentMacOS
//
//  Header for C wrapper functions
//

#ifndef EvolisWrapper_h
#define EvolisWrapper_h

#include "evolis/evolis.h"

// Wrapper for evolis_get_devices - gets all printers
int evolis_get_all_devices(evolis_device_t** devices);

// Wrapper to get devices of a specific model
int evolis_get_devices_by_model(evolis_device_t** devices, int model);

#endif /* EvolisWrapper_h */
