#ifndef BEMATECH_H
#define BEMATECH_H
#include <stddef.h>
#include <stdint.h>
#define BP_VERSION "0.1.1"
#define BP_MAX_JOB (4u * 1024u * 1024u)
typedef struct { uint8_t *data; size_t len, cap; } bp_buffer;
typedef struct { int columns, dots, spacing, feed, cut; } bp_options;
bp_options bp_defaults(void);
void bp_free(bp_buffer *b);
int bp_append(bp_buffer *b, const void *data, size_t size);
int bp_text(bp_buffer *out, const char *utf8, const bp_options *opt);
/* Packed, row-aligned, MSB-first bitmap. One means black. */
int bp_bitmap(bp_buffer *out, const uint8_t *pixels, size_t size,
              unsigned width, unsigned height, const bp_options *opt);
int bp_pbm(bp_buffer *out, const uint8_t *pbm, size_t size, const bp_options *opt);
int bp_send(const char *device, const uint8_t *data, size_t size, char *error, size_t error_size);
int bp_serve(const char *device, unsigned port, int open_browser, const bp_options *opt);
#endif
