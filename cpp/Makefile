CXX ?= g++
CXXFLAGS ?= -O2 -std=c++17
LDFLAGS ?=

all: bdc6_shm_write shm_can_sender

bdc6_shm_write: bdc6_shm_write.cpp
	$(CXX) $(CXXFLAGS) bdc6_shm_write.cpp -o bdc6_shm_write

shm_can_sender: shm_can_sender.cpp
	$(CXX) $(CXXFLAGS) shm_can_sender.cpp -o shm_can_sender

install:
	install -m 0755 bdc6_shm_write /usr/local/bin/bdc6_shm_write
	install -m 0755 shm_can_sender /usr/local/bin/shm_can_sender
