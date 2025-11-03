target_lines = 2_000_000  # Change this to be the amount of lines you want in many_lines.c
outfile = "many_lines.c"

with open(outfile, "w", encoding="utf-8") as f:
    f.write("#include <stdio.h>\n\n")
    # tiny statements that use almost no bytes per line
    for i in range(target_lines):
        f.write(f"int a{i}=0;\n")  # 10–12 bytes per line
    f.write("\nint main(){ printf(\"done\\n\"); return 0; }\n")

print("many_lines.c created ")