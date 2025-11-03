with open("test_big.c", "w") as f:
    f.write("#include <stdio.h>\n\n")
    for i in range(100000): #Change the range to be the number of functions you want in test_big.c
        f.write(f"void func{i}() {{ int x={i}; x+=1; }}\n")
    f.write("\nint main(){\n")
    for i in range(100000): #Change the range to be the number of functions you want in test_big.c
        f.write(f"    func{i}();\n")
    f.write('    printf("Done!\\n");\n    return 0;\n}\n')

print("test_big.c created")