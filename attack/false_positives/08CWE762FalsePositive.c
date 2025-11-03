#include <stdlib.h>

int main() {
    int *p = malloc(sizeof(int));
    if (!p) return 1;  // check allocation success

    free(p);
    return 0;
}