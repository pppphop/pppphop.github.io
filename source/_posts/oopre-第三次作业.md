---
title: "oopre-第三次作业"
date: "2025-09-24 17:08:08"
updated: "2026-02-07 17:11:16"
categories:
  - "oopre"
tags:
  - "oopre"
permalink: "posts/oopre-第三次作业/"
---
# 第三次作业

### <strong>背景</strong>

本次作业需在第二次作业的基础上进行开发，确保完全实现前次题目的要求，并沿用既有代码。

随着上次作业的铺垫，冒险者现已配备了装备和药水瓶。然而，考虑到外出探险时携带全部家当并不现实，我们引入了“背包”这一新元素。

为更精准地评估冒险者的状态，我们新增了四个关键属性：体力（`hitPoint`）、攻击力（`atk`）、防御力（`def`）、魔力值（`mana`）。

同时，我们提出了”可用物品”（`Usable`）的概念。药水瓶也进行了细化，分为四种类型，并引入了法术的概念。

针对上述内容，本次作业的任务涉及：

1. 对冒险者的属性管理进行完善；
2. 通过面向对象中的继承机制，详细划分药水瓶的类别；
3. 设计并实施背包系统，使冒险者能选择携带所需物品进行探险。
4. 通过接口机制，增加对于可用物品（药水和法术）的使用。

### <strong>背包限制</strong>

上次作业定义了添加的概念（add），这仅仅是让这名冒险者拥有了这个物品，但是他并没有携带这个物品。

本次作业对<strong>携带</strong>的概念进行界定：当且仅当<strong>这个物品属于该冒险者且在该名冒险者的背包中</strong>，才能称该冒险者携带了此物品。

特别地，不对物品的携带进行限制，即<strong>随时随地，任何冒险者所拥有的物品都可以被携带</strong>。

但是，假设冒险者 A 尝试携带物品 B ，但 B 已经在冒险者背包里了，那么此时这条 ti 指令不会造成任何影响（物品 B 依旧在冒险者的背包里，但仍然需要按照后文的输出格式进行输出）。

当物品被删除时，物品会被解除携带。

接下来，我们对物品的使用进行规定。

### <strong>可用物品</strong>

可用物品分为法术和药水瓶两类，可以被使用。在被使用时，需要指定一位冒险者为使用目标，并会对使用目标造成一定的影响，该目标可以任意指定，但是必须存在。

### 法术

当冒险者学习了一个法术后，他会<strong>永久拥有</strong>使用这个法术的能力，且可以<strong>无限次</strong>使用。若冒险者没有学习某个法术，其不能使用该法术。

每个法术具有唯一标识符 `id`、魔力耗费 `manaCost` 和能力值`power` 三个属性。使用法术时，冒险者当前的 `mana` 值必须<strong>大于等于</strong>使用法术的 `manaCost` 。使用后，冒险者的 `mana` 会扣除`manaCost` 的值。成功使用法术的效果详见附表。

法术分为攻击法术和治疗法术两类，由 <strong>`type`</strong> 指定。

<strong>类型`type`</strong> <strong>意义</strong>     `HealSpell` 治疗法术，若冒险者成功使用了治疗法术，则目标增加所使用法术 `power` 的 `hitPoint` 。   `AttackSpell` 攻击法术，若冒险者成功使用了攻击法术，则目标扣除所使用法术 `power` 的 `hitPoint` 。如果目标的`hitpoint`在被攻击后小于 `0` ，则强制置为 `0`。

### 药水瓶

当冒险者携带药水瓶 A 时，他才能使用该药水瓶 A；未携带则使用失败。

使用时，目标的相关属性会相应改变（详见附表），并丢弃该药水瓶。丢弃后的药水瓶不再认为被冒险者所拥有和携带。

<strong>Bottle药水瓶：分为体力恢复药水、力量药水、防御药水和魔力药水</strong>。

<strong>类型`type`</strong> <strong>意义</strong>     `HpBottle` 体力恢复药水。若冒险者使用体力恢复药水，则目标增加数值为`effect`的体力。   `AtkBottle` 力量药水。若冒险者使用力量药水，则目标增加数值为 `effect` 的攻击力。   `DefBottle` 防御药水。若冒险者使用防御药水，则目标增加数值为`effect` 的防御力。   `ManaBottle` 魔力药水。若冒险者使用魔力药水，则目标增加数值为`effect` 的魔力值。

### <strong>冒险者死亡</strong>

本次作业引入冒险者死亡的概念，当冒险者的血量小于等于 0 时，冒险者陷入死亡状态。<strong>任何对该冒险者的操作，都应当不产生任何影响</strong>，并输出一行 `{adv_id} is dead!` 。其中 `{adv_id}` 为死亡冒险者的 ID，如果某一条指令涉及到了多个死亡的冒险者，应当只输出在该指令死亡的冒险者中，参数位置最靠前的一位。

### <strong>操作要求</strong>

在本次作业中，初始时，你没有需要管理的冒险者，可通过若干条操作指令来修改当前的状态：

（<strong>仅`ae`指令不变</strong>）

1. 加入一个需要管理的冒险者（新加入的冒险者不携带任何药水瓶和装备，并且初始体力为 500，初始攻击力为 1，初始防御力为 0，初始魔力值为10）
2. 给某个冒险者增加一个药水瓶
3. 给某个冒险者增加一个装备
4. 给某个冒险者学习一个法术
5. 删除某个冒险者的某个物品
6. 冒险者尝试携带他拥有的某个物品
7. 冒险者对一个目标使用某个可用物品

### <strong>输入输出格式</strong>

第一行一个整数 n，表示操作的个数。

接下来的 n 行，每行一个形如 `{type} {attribute}` 的操作，`{type}` 和 `{attribute}` 间、若干个 `{attribute}` 间使用<strong>若干</strong>个空格分割，操作输入形式及其含义如下。

以下表格中全称仅供同学们方便将指令缩写和具体指令对应，无实际作用。

如果一条指令并没有涉及到已经死亡的冒险者，那么将此指令视作“<strong>正常指令</strong>”，其输出格式如下所示。否则，将此指令视作“<strong>异常指令</strong>”，其输出格式已于上文题及。

<strong>type</strong> <strong>全称</strong> <strong>attribute</strong> <strong>意义</strong> <strong>正常情况下的输出（每条对应占一行）</strong>     `aa` add adventurer `{adv_id}` 加入一个 ID 为 `{adv_id}`的冒险者 无   `ab` add bottle `{adv_id} {bot_id} {type} {effect}` 给 ID 为 `{adv_id}` 的冒险者增加一个药水瓶，药水瓶的 ID、类型、效果值分别为 `{bot_id}`、`{type}`、`{effect}`。 其中 `{type}` 是 `HpBottle` \ `AtkBottle` \ `DefBottle` \ `ManaBottle` 中其中一个。 无   `ae` add equipment `{adv_id} {equ_id}` 给 ID 为 `{adv_id}` 的冒险者增加一个装备，装备的 ID为 `{equ_id}` 无   `ls` learn spell `{adv_id} {spe_id} {type} {manaCost} {power}` 使 ID 为 `{adv_id}` 的冒险者学习一个法术，法术的 ID，类型，魔力耗费，能力值分别为 `{spe_id}` 、`{type}` 、`{manaCost}`、`{power}`。 其中 `{type}` 是 `HealSpell` \ `AttackSpell`中其中一个。 无   `ri` remove item `{adv_id} {item_id}` 将 ID 为`{adv_id}`的冒险者的 id 为 `{item_id}` 的物品删除 `{一个字符串A}`，字符串 A 为物品的类名（答案只能在以下类名中挑选其一： `HpBottle`、`AtkBottle`、`DefBottle`、`ManaBottle`、`Equipment`）   `ti` take item `{adv_id} {item_id}` ID 为 `{adv_id}` 的冒险者尝试携带 id 为 `{item_id}` 的物品 `{一个字符串A}`，字符串 A 为物品的类名（答案只能在以下类名中挑选其一： `HpBottle`、`AtkBottle`、`DefBottle`、`ManaBottle`、`Equipment`）   `use` use `{adv_id} {usable_id} {target_id}` ID 为 `{adv_id}` 的冒险者尝试对 `{target_id}` 使用他拥有的 id 为`{usable_id}`的可用物品 成功：`{一个字符串} {一个整数A} {一个整数B} {一个整数C} {一个整数D}`，字符串为目标的 `id`，整数 A 为目标被作用后的体力值，整数 B 为目标被作用后的攻击力值，整数 C 为目标被作用后的防御力值 ，整数 D 为目标被作用后的魔力值。 失败：输出 `{adv_id} fail to use {usable_id}`

对于所有的异常指令，除了需要你输出对应的信息以外，该指令<strong>不应当有任何效果</strong>。

## 样例 1

### <strong>输入</strong>

```
8
aa Alice
aa Bob
ab Alice Bot1 HpBottle 40
ti Alice Bot1
use Alice Bot1 Bob
ae Alice Sword
ti Alice Sword
ri Alice Sword
```

### <strong>输出</strong>

```
HpBottle
Bob 540 1 0 10
Equipment
Equipment
```

### 解释

1. `aa`/`ab`/`ae` 无输出；
2. `ti Alice Bot1` 成功把 `Bot1` 放入背包 → 输出其<strong>类名</strong> `HpBottle`；
3. `use Alice Bot1 Bob` 使用药水成功，<strong>作用于目标 Bob</strong>：`hitPoint` 500→540，其余不变，输出 `Bob 540 1 0 10`；药水被丢弃；
4. `ti Alice Sword` 携带装备 → 输出 `Equipment`；
5. `ri Alice Sword` 删除装备（同时解除携带） → 输出 `Equipment`。

## 样例 2

### 输入

```
7
aa Alice
aa Bob
ls Alice Fire AttackSpell 5 520
use Alice Fire Bob
use Alice Fire Bob
ab Bob Bot2 HpBottle 30
ti Bob Bot2
```

### 输出

```
Bob 0 1 0 10
Bob is dead!
Bob is dead!
Bob is dead!
```

### 解释

1. `ls` 学会法术 `Fire(AttackSpell, manaCost=5, power=520)`；
2. 第一次 `use`：Alice 法力 10→5；对 <strong>Bob</strong> 造成 520 伤害，`hitPoint` 500→0（小于 0 强制置 0），输出 `Bob 0 1 0 10`；Bob 此后进入<strong>死亡状态</strong>；
3. 第二次 `use`：指令涉及 <strong>目标 Bob（已死亡）</strong>，按“异常指令”规则，仅输出 <strong>`Bob is dead!`</strong>，且不产生任何效果（不再扣 Alice 的法力）；
4. `ab Bob ...` 与 `ti Bob ...` 同理，因操作对象是死亡的 Bob，均只输出 <strong>`Bob is dead!`</strong>，不产生任何状态改变。

### <strong>数据限制</strong>

<strong>变量约束</strong>

<strong>变量</strong> <strong>类型</strong> <strong>说明</strong>     `id` 字符串 保证为仅包含大小写字母、数字与下划线的字符串，长度区间为 &#91;1, 40&#93;   `effect` 整数 取值范围：0 - 2147483647   `manaCost` 整数 取值范围：1 - 2147483647   `hitPoint` 整数 取值范围：0 - 2147483647   `atk` 整数 取值范围：1 - 1073741823   `def` 整数 取值范围：0 - 1073741823   `mana` 整数 取值范围：0 - 2147483647   `power` 整数 取值范围：0 - 2147483647

注意，变量约束指的是，在程序运行时，输入和对应属性值<strong>始终</strong>均保证在表格中给出的范围内。

<strong>操作约束</strong>

1. 保证所有添加的冒险者、药水瓶、装备、法术的 id 在全局范围内均不相同。
2. 保证增加的冒险者、装备、药水瓶和法术在操作执行时，系统中原本不存在对应 id 的实体。
3. 保证被删除的药水瓶/装备的 id 不会再次被用于添加新的药水瓶/装备/法术/冒险者。
4. 对于 `ab`, `ae`, `ls`, `ri`, `ti` 指令，保证操作中指定的 `{adv_id}` 一定存在，但不保证其对应的冒险者存活。
5. 对于 `use` 指令，保证操作中指定的 `{adv_id}` 和 `{target_id}` 一定存在，但不保证两者对应的冒险者存活。
6. 对于 `ri` 和 `ti` 指令，保证冒险者一定拥有操作中指定 `{item_id}` 的药水瓶或装备。
7. 对于 `use` 指令，保证冒险者一定拥有指定 `{usable_id}` 的药水瓶或法术。但如果 `{usable_id}` 对应的是药水瓶，则不保证冒险者一定携带了该药水瓶。
8. 总操作数 `n` 满足 1 ≤ n ≤ 2000。

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

经过这段代码，输入的信息会被存入 `inputInfo` 这个”二维数组”中，遍历该容器即可取出各行指令及其各个部分。
