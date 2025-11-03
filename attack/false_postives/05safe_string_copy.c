// test_fp_injection.c
#include <stdio.h>
#include <string.h>

int main(int argc, char* argv[]) {
    // Safe string operation using snprintf
    char buffer[256];
    char source[] = "hello world";
    
    snprintf(buffer, sizeof(buffer), "%s", source);
    printf("Result: %s\n", buffer);
    
    return 0;
}