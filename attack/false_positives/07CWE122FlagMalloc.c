#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main() {
    char *buffer = (char *)malloc(10);  // Allocate only 10 bytes on the heap
    if (!buffer) {
        perror("malloc failed");
        return 1;
    }

    // Unsafe: writes 20 bytes into a 10-byte heap allocation
    strcpy(buffer, "this string is too long");

    printf("Buffer content: %s\n", buffer);

    free(buffer);
    return 0;
}