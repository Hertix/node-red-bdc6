CC      ?= gcc
CFLAGS  ?= -O2 -Wall -Wextra -pedantic
LDFLAGS ?=
TARGET  ?= can_sender_v2

all: $(TARGET)

$(TARGET): can_sender_v2.c
	$(CC) $(CFLAGS) -o $@ $< $(LDFLAGS)

clean:
	rm -f $(TARGET)

