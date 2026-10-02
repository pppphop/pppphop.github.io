---
title: "oopre-第二次作业"
date: "2025-09-17 17:07:15"
updated: "2026-02-07 17:08:26"
categories:
  - "oopre"
tags:
  - "oopre"
permalink: "posts/oopre-第二次作业/"
---
# 第二次作业

### <strong>背景</strong>

在接下来的若干次作业中，同学们将进行以本次作业为基础的迭代开发，因此在具体的代码实现中，希望同学们可以考虑到每一次所写代码的可扩展性和可维护性，从而减少下一次的工作量。

在接下来的几次作业中，请想象你是一个穿越到魔法大陆上的冒险者，在旅途中，你需要收集各种道具，使用各种装备，招募其他冒险者加入队伍，提升自己的攻击力和防御力并体验各种战斗。

在本次作业中，你要做的是：

- 实现冒险者类 `Adventurer` 、药水瓶类 `Bottle` 、装备类 `Equipment`
- 利用容器，管理所有冒险者，并管理每一个冒险者所拥有的药水瓶和装备

你可能需要实现的类和它们要拥有的属性

- Adventurer ：ID，药水瓶和装备各自的容器
- Bottle：ID，效果(effect)
- Equipment：ID

其中，Bottle 的效果属性在本次作业中不会被测试，只需要管理并输出，但是却是后续作业的重要部分，请同学们不要忽略。

在本次作业中，初始时，你没有需要管理的冒险者，我们通过若干条操作指令来修改当前的状态：

1. 加入一个需要管理的冒险者（新加入的冒险者不携带任何药水瓶和装备）
2. 给某个冒险者增加一个药水瓶
3. 给某个冒险者增加一个装备
4. 删除某个冒险者的某个药水瓶
5. 删除某个冒险者的某个装备

### <strong>输入格式</strong>

第一行一个整数 n，表示操作的个数。

接下来的 n 行，每行一个形如 `{type} {attribute}` 的操作，`{type}` 和 `{attribute}` 间、若干个 `{attribute}` 间使用<strong>若干</strong>个空格分割，操作输入形式及其含义如下。同时，为了方便测评，我们需要在需要执行一些指令后进行相关输出。具体要求也在下面的表中列出：

以下表格中全称仅供同学们方便将指令缩写和具体指令对应，无实际作用。

<strong>type</strong> <strong>全称</strong> <strong>attribute</strong> <strong>意义</strong> <strong>输出（每条对应的占一行）</strong>     `aa` add adventurer `{adv_id}` 添加一个 ID 为 `{adv_id}` 的冒险者 无   `ab` add bottle `{adv_id} {bot_id} {effect}` 给 ID 为 `{adv_id}` 的冒险者添加一个 ID 为 `{bot_id}`、效果为 `{effect}` 的药水瓶 无   `ae` add equipment `{adv_id} {equ_id}` 给 ID 为 `{adv_id}` 的冒险者添加一个 ID 为 `{equ_id}` 的装备 无   `rb` remove bottle `{adv_id} {bot_id}` 将 ID 为 `{adv_id}` 的冒险者的 ID 为 `{bot_id}` 的药水瓶删除 输出 `{一个整数} {一个整数}`，第一个整数为删除后冒险者剩余的药水瓶数量，第二个整数为删除的药水瓶的效果   `re` remove equipment `{adv_id} {equ_id}` 将 ID 为 `{adv_id}` 的冒险者的 ID 为 `{equ_id}` 的装备删除 输出 `{一个整数}`，表示删除后冒险者剩余的装备数目

### <strong>输入输出样例</strong>

### <strong>输入1</strong>

```
6
aa Alice
ab Alice HealPotion 50
ab Alice ManaPotion 100
ae Alice IronSword
rb Alice HealPotion
re Alice IronSword
```

### <strong>输出1</strong>

```
1 50
0
```

1. aa Alice: 添加ID为 Alice 的冒险者。
2. ab Alice HealPotion 50: 给 Alice 添加ID为 HealPotion、效果为 50 的药水瓶。
3. ab Alice ManaPotion 100: 给 Alice 添加ID为 ManaPotion、效果为 100 的药水瓶。此时她拥有2个药水瓶。
4. ae Alice IronSword: 给 Alice 添加ID为 IronSword 的装备。此时她拥有1个装备。
5. rb Alice HealPotion: 删除 Alice 的药水瓶 HealPotion。删除后她还剩下1个药水瓶，被删除的药水瓶效果为 50。因此输出 1 50。
6. re Alice IronSword: 删除 Alice 的装备 IronSword。删除后她还剩下0个装备。因此输出 0。

### 数据限制

<strong>变量约束</strong>

变量 类型 说明     `id` 字符串 保证为仅包含大小写字母、数字与下划线的字符串，长度区间为 &#91;1, 40&#93;   `effect` 整数 取值范围：0 - 2147483647

注意，变量约束指的是，在程序运行时，输入和对应属性值<strong>始终</strong>均保证在表格中给出的范围内。

<strong>操作约束</strong>

1. 保证所有添加的冒险者、药水瓶、装备的 id 在全局范围内均不相同。
2. 保证增加的冒险者、装备和药水瓶在操作执行时，系统中原本不存在对应 ID 的实体。
3. 保证被删除的药水瓶/装备的 id 不会再次被用于添加新的药水瓶/装备/冒险者。
4. 对于 `ab`, `ae`, `rb`, `re` 指令，保证操作中指定的 `{adv_id}` 一定存在。
5. 对于 `rb` 和 `re` 指令，保证冒险者一定拥有操作中指定的 `{bot_id}` 或 `{equ_id}` 的物品。
6. 总操作数 `n` 满足 1 ≤ n ≤ 2000。

### <strong>junit 测试</strong>

我们在 gitlab 上准备了一份 <strong>junit 使用示例代码</strong>（基于hw1程序）以及一份 <strong>junit使用文档</strong> 供大家参考，推荐各位同学在课下测试时使用 junit 单元测试来对自己的程序进行测试

- junit 是一个单元测试包，<strong>可以通过编写单元测试类和方法，来实现对类和方法实现正确性的快速检查和测试</strong>。还可以查看测试覆盖率以及具体覆盖范围（精确到语句级别），以帮助编程者全面无死角地进行程序功能测试。
- 此外，Junit 对主流 Java IDE（Idea、eclipse 等）均有较为完善的支持，具体的配置和使用方法可以参考 gitlab 上的使用文档。

### <strong>要求</strong>

本次作业要求同学们需要自行编写 junit 测试代码对自己的代码进行测试。在本次作业中，检测到 <strong>存在junit测试方法</strong> 并可以 <strong>成功编译</strong> 即视为通过 junit 评测。

### <strong>提示</strong>

考虑到正课尚未讲解有关输入解析的内容，我们在此提供一份输入解析代码，同学们可以将其复制到自己代码中的适当位置直接使用，当然，同学们也可以自行设计代码来进行输入解析。

```
ArrayList<ArrayList<String>> inputInfo = new ArrayList<>(); // 解析后的输入将会存进该容器中, 类似于c语言的二维数组
Scanner scanner = new Scanner(System.in);
int n = Integer.parseInt(scanner.nextLine().trim()); // 读取行数
for (int i = 0; i < n; ++i) {
    String nextLine = scanner.nextLine(); // 读取本行指令
    String[] strings = nextLine.trim().split(" +"); // 按空格对行进行分割
    inputInfo.add(new ArrayList<>(Arrays.asList(strings))); // 将指令分割后的各个部分存进容器中
}
```

经过这段代码，输入的信息会按照顺序被存入`inputInfo`这个”二维数组”中，遍历该容器即可取出各行指令及其各个部分。
