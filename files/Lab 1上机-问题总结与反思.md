# Lab 1上机-问题总结与反思

## 题面复原

### 1.Lab1_exam：简化版 readelf64

**题目描述**

本题要求在 `tools/readelf64` 目录下补全一个简化版的 `readelf64`，用于解析 64-bit little-endian ELF 文件。

符号表 `.symtab` 是 ELF 文件中的一个重要节，里面记录了程序中的符号信息，比如函数名、变量名等。本题不要求我们真正解析符号表里面的每一项，而是要求我们输出 ELF 文件中所有节头的信息，并找到 `.symtab` 这个节在节头表中的下标。

课下练习中我们已经实现过一个简化版的 32 位 `readelf`，这次相当于是把思路迁移到 64 位 ELF 上。核心区别在于原来用的 `Elf32_` 系列结构体，这里要换成 `Elf64_` 系列结构体。

**前置知识**

ELF 文件开头是 ELF Header，也就是 ELF 文件头。它告诉我们这个 ELF 文件的大致布局，比如节头表在哪里、节头表有多少项、节名称字符串表在哪里。

本题主要关注 `Elf64_Ehdr` 里的三个字段：

- `e_shoff`：节头表在文件中的偏移；
- `e_shnum`：节头表表项数量，也就是总节数；
- `e_shstrndx`：节名称字符串表对应节头在节头表中的下标。

节头表可以看成一个 `Elf64_Shdr` 数组，每个数组元素描述一个 section。每个 `Elf64_Shdr` 中，本题主要用到：

- `sh_name`：节名在节名称字符串表中的偏移；
- `sh_offset`：该节在文件中的偏移；
- `sh_size`：该节的大小。

这里最容易误解的是：`sh_name` 不是一个字符串指针，而是一个偏移量。要拿到真正的节名，必须先通过 `e_shstrndx` 找到 `.shstrtab` 对应的节头，再通过这个节头的 `sh_offset` 找到节名称字符串表的内容。之后某个节的名字就是：

```c
section_name = shstrtab + shdr->sh_name;
```

**任务要求**

需要在 `tools/readelf64/readelf64.c` 中补全代码，实现以下功能：

1. 读取 ELF64 文件头；
2. 定位节头表；
3. 通过节名称字符串表解析每个节头的名称；
4. 遍历所有节头，输出：
   - 节头序号，从 0 开始；
   - 节名称；
   - 文件偏移 `sh_offset`；
   - 节大小 `sh_size`；
5. 在遍历过程中找到名称为 `.symtab` 的节，并输出它在节头表中的下标。

**输出格式**

程序输出格式大致如下：

```text
section_count=<count>
[0]	name="<section_name>"	offset=0x<offset>	size=<size>
[1]	name="<section_name>"	offset=0x<offset>	size=<size>
...
symtab_index=<index>
```

其中每一节的信息要求严格使用下面这个格式串：

```c
"[%d]\tname=\"%s\"\toffset=0x%lx\tsize=%lu\n"
```

也就是说，`offset` 要用小写十六进制输出，带 `0x` 前缀，不补前导零；`size` 按十进制输出。最后还要输出 `.symtab` 的下标。

**评测重点**

这题的测试点大致可以拆成：

- 能否正确读取 ELF64 文件头并输出 `section_count`；
- 能否正确输出所有 section 的 `name`、`offset`、`size`；
- 能否正确找到 `.symtab` 并输出 `symtab_index`；
- 最终输出内容是否完全一致。

------

### 2.Lab1_extra：格式化输入 scank 的实现

**题目描述**

Extra 要在操作系统内核中实现一个简化版的格式化输入函数 `scank`，功能类似于标准库里的 `scanf`。由于 OS 内核里没有完整的 C 标准库，所以需要自己实现格式解析。

本题只需要支持三个格式控制符：

- `%c`
- `%u`
- `%s`

这题真正的重点不是“读入字符”本身，而是读入过程中对字符流的处理。特别是 `%u` 和 `%s` 都是变长读取，它们必须多读一个字符才能知道当前字段结束了。这个多读出来的字符不能丢掉，而要留给下一个格式符继续解析。

所以这题的核心就是一个单字符缓冲区：读多了不能扔，真正消耗了才置为无效。

**核心解析规则**

空白符包括：

```text
空格 ' '、水平制表符 '\t'、换行符 '\n'、回车符 '\r'
```

#### `%c`

`%c` 表示读取单个字符。

它的规则是：

- 不跳过前导空白；
- 当前下一个字符是什么，就读什么；
- 读完一个字符后立即结束；
- 因为这个字符已经被真正消耗掉，所以缓冲区要置为无效。

也就是说，`%c` 和 `%u`、`%s` 最大的区别就是：它不跳过空白。

#### `%u`

`%u` 表示读取无符号十进制整数。

它的规则是：

- 必须跳过所有前导空白；
- 支持一个前导加号 `+`；
- 连续读取数字字符；
- 遇到第一个非数字字符时停止；
- 这个导致停止的非数字字符必须留在缓冲区中，不能丢掉；
- 如果第一个非空白字符既不是数字也不是 `+`，则直接赋值为 0。

举个例子，如果输入是：

```text
   +123abc
```

那么 `%u` 应该读到 `123`，而字符 `a` 要留给下一个格式符。

#### `%s`

`%s` 表示读取字符串。

它的规则是：

- 必须跳过所有前导空白；
- 连续读取非空白字符；
- 遇到第一个空白符或 `\0` 时停止；
- 字符串末尾要自动补 `\0`；
- 导致停止的那个空白符要留在缓冲区中，不能丢掉。

举个例子，如果输入是：

```text
   MOS_Kernel  test
```

那么 `%s` 应该读到 `MOS_Kernel`，而后面的空格要保留下来。

**任务要求**

本题需要修改的地方主要有三个。

第一，在 `include/printk.h` 中加入声明：

```c
int scank(const char *fmt, ...);
```

第二，在 `include/print.h` 中加入声明：

```c
typedef void (*scan_callback_t)(void *data, char *buf, size_t len);
int vscanfmt(scan_callback_t in, void *data, const char *fmt, va_list ap);
```

第三，在 `kern/printk.c` 中实现 `inputk` 和 `scank`，在 `lib/print.c` 中实现真正的格式化解析逻辑，包括：

- `scan_c`
- `scan_s`
- `scan_u`
- `vscanfmt`

其中题面已经给出了 `ensure_char` 和 `skip_whitespace` 的框架。`ensure_char` 的作用是保证缓冲区里有一个有效字符；`skip_whitespace` 的作用是跳过 `%u` 和 `%s` 前面的空白符。

**评测重点**

Extra 的测试点主要包括：

- 单独测试 `%c`；
- 单独测试 `%u`；
- 单独测试 `%s`；
- `%c` 和 `%u` 相连；
- `%c` 和 `%s` 相连；
- 综合混合测试。

所以这题不能只让单个格式符能跑，真正重要的是多个格式符连续出现时，缓冲区状态是否正确。

## 解答与反思

这次 Lab1 的 exam 和 extra 我都是满分，整体感觉比起代码量，真正考的是能不能把题面里的细节逐条落实。

### Exam 的思路

Exam 这题本质上还是课下 32 位 `readelf` 的延伸。只要理解 ELF 文件是“基地址 + 偏移”的结构，整体就很顺。

我的核心思路大概是这样：

```c
Elf64_Ehdr *ehdr = (Elf64_Ehdr *)binary;
Elf64_Shdr *sh_table = (Elf64_Shdr *)((char *)binary + ehdr->e_shoff);
Elf64_Shdr *shstr_shdr = &sh_table[ehdr->e_shstrndx];
char *shstrtab = (char *)binary + shstr_shdr->sh_offset;
```

这几行基本就是整道题的核心。

第一行先把文件开头当成 ELF Header。然后通过 `e_shoff` 找到节头表。节头表找到以后，再用 `e_shstrndx` 找到节名称字符串表对应的节头。最后通过这个节头的 `sh_offset` 找到真正的字符串表内容。

后面遍历所有节头即可：

```c
for (int i = 0; i < ehdr->e_shnum; i++) {
    Elf64_Shdr *shdr = &sh_table[i];
    char *section_name = shstrtab + shdr->sh_name;

    printf("[%d]\tname=\"%s\"\toffset=0x%lx\tsize=%lu\n",
           i, section_name, shdr->sh_offset, shdr->sh_size);

    if (strcmp(section_name, ".symtab") == 0) {
        symtab_index = i;
    }
}
```

最后输出：

```c
printf("symtab_index=%d\n", symtab_index);
```

这题我觉得最容易错的地方有三个。

第一个是把偏移当指针。`e_shoff`、`sh_offset`、`sh_name` 都是相对于文件基地址的偏移，不是直接能解引用的地址。一定要写成：

```c
(char *)binary + offset
```

第二个是 32 位和 64 位结构体没有改干净。比如如果还用 `Elf32_Ehdr` 或 `Elf32_Shdr`，在 64 位 ELF 上字段解释就会错。

第三个是输出格式。这个题的格式比较严格，尤其是 `\t`、`0x%lx`、`%lu`，不能自己随便改成空格或者别的格式。满分很大一部分其实就是格式没有飘。

### Extra 的思路

Extra 这题表面上是在实现 `scank`，但我感觉真正考的是“输入流状态机”。

一开始我也会自然想到：读到不属于当前格式的字符就结束。但题面反复强调，这个字符不能丢，因为它可能正是下一个格式符要读的东西。

所以我把它理解成：`ch` 是一个单字节缓存，`ch_valid` 表示这个缓存现在有没有东西。

```c
char ch;
int ch_valid = 0;
```

如果 `ch_valid == 0`，说明当前没有缓存字符，需要调用输入函数读一个；如果 `ch_valid == 1`，说明上一次已经多读了一个字符，这次要先处理它，不能再读新字符。

#### scank 的包装

`scank` 本身没有什么复杂逻辑，基本就是仿照 `printk` 处理可变参数：

```c
int scank(const char *fmt, ...) {
    va_list ap;
    int ret;

    va_start(ap, fmt);
    ret = vscanfmt(inputk, NULL, fmt, ap);
    va_end(ap);

    return ret;
}
```

这里 `inputk` 负责从控制台读字符，同时把 `\r` 统一成 `\n`，再做终端回显。真正的格式解析交给 `vscanfmt`。

#### %c 的实现

`%c` 最简单，但也是最容易因为“下意识跳过空白”而错的。

```c
void scan_c(scan_callback_t in, void *data, char *ch, int *ch_valid, char *cp) {
    ensure_char(in, data, ch, ch_valid);
    *cp = *ch;
    *ch_valid = 0;
}
```

这里不能调用 `skip_whitespace`。因为 `%c` 就是要读当前字符，即使当前字符是空格或者换行，也必须读进去。

读完后要把 `ch_valid` 置为 0，因为这个字符已经被 `%c` 真正吃掉了。

#### %s 的实现

`%s` 要先跳过前导空白，然后一直读非空白字符：

```c
void scan_s(scan_callback_t in, void *data, char *ch, int *ch_valid, char *cp) {
    skip_whitespace(in, data, ch, ch_valid);

    while (*ch != ' ' && *ch != '\t' && *ch != '\n' && *ch != '\r' && *ch != '\0') {
        *cp++ = *ch;
        in(data, ch, 1);
    }

    *cp = '\0';
    *ch_valid = 1;
}
```

这里最后 `ch_valid` 要保持为 1，因为循环停下来的时候，`ch` 里面正好是那个导致字符串结束的空白字符。这个字符不能丢，要留给下一个格式符。

这也是这题的核心细节之一。

#### %u 的实现

`%u` 和 `%s` 类似，也要先跳过前导空白。不过它多了一个前导 `+` 的处理：

```c
void scan_u(scan_callback_t in, void *data, char *ch, int *ch_valid, int *ip) {
    int num = 0;

    skip_whitespace(in, data, ch, ch_valid);

    if (*ch == '+') {
        in(data, ch, 1);
    }

    if (*ch < '0' || *ch > '9') {
        *ip = 0;
        *ch_valid = 1;
        return;
    }

    while (*ch >= '0' && *ch <= '9') {
        num = num * 10 + (*ch - '0');
        in(data, ch, 1);
    }

    *ip = num;
    *ch_valid = 1;
}
```

这里有两个地方比较关键。

第一，如果遇到 `+`，要读下一个字符继续判断，但 `+` 本身不计入数字。

第二，如果遇到非数字字符停下来，这个非数字字符也要留在 `ch` 里，所以 `ch_valid` 仍然是 1。

比如输入：

```text
+123abc
```

那么 `%u` 读完以后，结果是 `123`，但是 `a` 还在缓存里。如果下一个格式是 `%c`，那它读到的就应该是 `a`。

#### vscanfmt 的整体结构

`vscanfmt` 的主循环其实就是扫描格式字符串，遇到 `%s`、`%u`、`%c` 就调用对应函数：

```c
int vscanfmt(scan_callback_t in, void *data, const char *fmt, va_list ap) {
    char ch;
    int ch_valid = 0;
    int ret = 0;

    while (*fmt) {
        if (*fmt == '%') {
            fmt++;

            switch (*fmt) {
            case 's':
                scan_s(in, data, &ch, &ch_valid, va_arg(ap, char *));
                ret++;
                break;

            case 'u':
                scan_u(in, data, &ch, &ch_valid, va_arg(ap, int *));
                ret++;
                break;

            case 'c':
                scan_c(in, data, &ch, &ch_valid, va_arg(ap, char *));
                ret++;
                break;
            }
        }
        fmt++;
    }

    return ret;
}
```

这里 `ret` 统计成功解析的格式符个数。题目骨架本身已经给得比较清楚，只要把三个扫描函数写对，基本就能过。

### 总结

这次 Lab1 的两个题其实都很典型。

Exam 考的是 ELF 结构的理解，尤其是“文件基地址 + 偏移”这个思路。只要能从 ELF Header 找到 Section Header Table，再从 `e_shstrndx` 找到 `.shstrtab`，后面遍历和找 `.symtab` 就很自然。

Extra 考的是输入流解析中的状态保存。`%u` 和 `%s` 必须多读一个字符才能判断结束，但这个字符又不能丢，所以需要用 `ch + ch_valid` 维护一个一字符缓冲。`%c` 则正好相反，它不跳过空白，而且读完就真正消耗字符，要把缓存置为无效。

我觉得这次能满分主要是因为没有只看样例，而是把题面里那些看起来很啰嗦的细节都落实了。尤其是 extra，隐藏测试一定会测格式符连续出现的情况。如果只是单独测 `%u`、`%s` 都能过，但没有保留多读出来的字符，那么混合测试就很容易挂。

总体来说，Lab1 比 Lab0 更接近 OS 课程自己的味道：不是单纯写 C，而是在有限的内核环境里理解数据结构和状态流。Exam 是 ELF 文件的结构流，Extra 是控制台输入的字符流，本质上都是在练“不要丢状态”。