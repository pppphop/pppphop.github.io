---
title: "oopre-第五次作业"
date: "2025-10-18 17:50:22"
updated: "2026-02-07 17:51:44"
categories:
  - "oopre"
tags:
  - "oopre"
permalink: "posts/oopre-第五次作业/"
---
# 第五次作业

### <strong>背景</strong>

本次作业需在第三次作业的基础上进行进一步开发与拓展，同学们应在完全实现第三次作业的所有功能与代码要求的基础上，沿用其代码框架进行构建。

本次作业的核心要点包括但不限于：

1. <strong>背包功能的完善与物品数量控制</strong>：确保背包能够正确管理并限制各类物品的携带数量。
2. <strong>装备类型的细化与实现</strong>：通过继承机制将装备分为三个子类型，使不同装备具备独特效果。
3. <strong>战斗系统的细化与冒险者属性调整</strong>：引入战斗机制，并根据战斗结果准确调整冒险者及物品的属性。

### 装备类型

本次作业我们将细分装备类型，基础的装备（Equipment）下，我们细分装甲（Armour）与武器（Weapon）两类，武器下再详细为两类：剑（Sword）与魔法书（Magicbook）。同一个冒险者同时最多只能<strong>携带</strong>一件装甲和一把武器。装备自身带有战斗力（CE ）属性。

本次冒险者的属性计算将分为基础属性和装备属性两类，冒险者的初始属性和药水提供的加成都为基础属性。冒险者的最终属性（简称属性）为基础属性＋装备属性。如果没有特殊提及，我们用到的属性都是最终属性。

当冒险者<strong>携带</strong>一件装甲时，冒险者的装备防御力为护甲CE值。该加成为装备属性的临时加成，即当冒险者不携带该装甲时，该加成失效。当冒险者<strong>携带</strong>一件武器时，冒险者的装备攻击力为武器CE值。该加成同样为临时加成。

### <strong>背包限制</strong>

在第三次作业中，我们明确了“携带”的定义：只有当物品归属于某冒险者并位于其背包内时，该物品才被视为被携带。特别规定，若冒险者尝试携带已在背包中的物品。ti 指令不会产生任何影响，物品状态保持不变。

本次作业在继承上述定义的基础上，进一步变化且细化了规则，针对不同类型的物品分别制定明确的携带与使用规范。

### <strong>装备</strong>

冒险者只能携带一件武器和一件装甲（武器与装甲各可携带一件，互不冲突）。当冒险者尝试携带一个武器/装甲时，如果原先已经携带了一个武器/装甲，则原先的武器/装甲会被顶替，冒险者仍然拥有原先的武器/装甲，但是不携带。

例如，若冒险者已经携带了类型为 `Sword` 的武器（该武器 `id` 为 1），下一次再尝试携带另一个类型为 `Magicbook` 的不同武器（该武器`id`为 2）时，原本 `id` 为 1 的 `Sword` 会被顶替。

### <strong>药水瓶</strong>

药水瓶的使用说明与第三次迭代作业一致，其加成视为基础属性的永久加成。

与前述迭代不同的是，冒险者只能携带 10 个药水瓶。当冒险者药水背包容量满时，再携带药水时，会顶替掉当前携带的药水瓶中最先携带的一瓶（变为未携带状态）。

### <strong>战斗</strong>

首先，鉴于受攻击方可能包含一位或多位冒险者，我们特此明确界定<strong>受攻击方的整体防御能力</strong>：此能力被定义为<strong>受攻击方所有个体防御力中的最大值</strong>，即通过对所有受攻击个体的防御力进行比较后选取的最大值作为该受攻击方整体的防御能力标准。

当冒险者携带的武器类型为 `Sword` 或者不携带武器时，冒险者会尝试发动一次物理攻击。当冒险者携带的武器为 `Magicbook` 时，冒险者会尝试发动一次魔法攻击。

物理攻击成功的条件被严格界定为：<strong>当且仅当攻击者的基础攻击力与所携装备所提供的战斗力之和，能够严格大于受攻击方的整体防御能力，方可判定战斗成功</strong>。若不满足上述条件，则战斗失败。

魔法攻击成功的条件被严格界定为：<strong>当且仅当攻击者的魔力值不小于使用武器的 $\lceil \sqrt{CE} \rceil$时，可判定战斗成功</strong>。若不满足上述条件，则战斗失败。

> 示例-Example
>
> 假设存在冒险者 A（基础攻击力100），冒险者 B（防御力130），以及冒险者 C（防御力160）。若冒险者 A 携带了提供50点攻击力的 `Sword` ，并意图发起战斗：
>
> - 由于 A 携带的是 `Sword` ，该次攻击为物理攻击。
> - 若 A 攻击 B，由于100（ A 的基础攻击力）+50（装备战斗力）=150&#62;130（ B 的防御力），故 A 对 B 的战斗成功。
> - 若 A 攻击 C，由于100（ A 的基础攻击力）+50（装备战斗力）=150&#60;160（ C 的防御力），故 A 对 C 的战斗失败。
> - 若 A 同时攻击 B 与 C，则受攻击方的整体防御能力为160（160&#62;130），由于100（ A 的基础攻击力）+50（装备战斗力）=150&#60;160，故 A 对 B 与 C 的联合攻击视为失败。

在战斗失败的情况下，所有参与该战斗的冒险者的体力值将保持不变，不发生任何调整。而一旦战斗成功，则根据以下规则调整攻击者和被攻击者的属性值。

<strong>物理攻击：</strong>所有被攻击者的体力值减去（攻击者的攻击力 - 受攻击方的整体防御能力）。

<strong>魔法攻击：</strong>所有被攻击者的体力值减去攻击者的攻击力。攻击者的魔力值减去 $\lceil \sqrt{CE} \rceil$。

注：若有被攻击者的体力值在这个过程中会变为负数，则此被攻击者的体力值应该变为 0。

### 金钱系统

本次作业引入金钱系统，冒险者可以在商店使用金币购买药水瓶或装备。你需要维护冒险者的新增属性 `money`，代表其拥有的金币数量。新加入的冒险者会有 50 个初始金币，金币还可以通过击杀冒险者获取，具体获取规则如下：

- 冒险者 A 通过<strong>战斗</strong>或<strong>使用攻击法术</strong>使冒险者 B 死亡，可以获取的金币总数为（冒险者 B 拥有的金币数量 + 冒险者 B 拥有的所有药水瓶的 effect 的总和 + 冒险者 B 拥有的所有装备的 CE 的总和）

冒险者可以在商店进行购买操作，每次购买操作会消耗 $\min⁡(money,100)$个金币。设冒险者使用了 `{x}` 个金币进行购买，那么他可以获得的物品由如下规则给出：

- 若冒险者选择购买药水瓶类的物品（`HpBottle`、`AtkBottle`、`DefBottle`、`ManaBottle`），那么他会获得一个 effect 为 `{x}` 的药水瓶。
- 若冒险者选择购买装备类的物品（`Sword` 、`Magicbook` 、`Armour` ），那么他会获得一个 CE 为 `{x}` 的装备。

注：冒险者在拥有金币数量为 0 的情况下也可以进行购买操作。根据上述规则，此时他会得到一个 effect 为 0 的药水瓶或一个 CE 为 0 的装备。

我们推荐使用工厂模式来完成这部分内容，以下给出部分参考代码，同学们可以根据自身的架构进行调整

```
public class Factory {
    public static Bottle createBottle(String type, String id, int effect) {
        switch (type) {
            case "HpBottle":
                return new HpBottle(id, effect);
            case "AtkBottle":
                return new AtkBottle(id, effect);
            case "DefBottle":
                return new DefBottle(id, effect);
            case "ManaBottle":
                return new ManaBottle(id, effect);
            default:
                return null;
        }
    }

    public static Spell createSpell(String type, String id, int cost, int power) {
        ...
    }

    public static Equipment createEquipment(String type, String id, int ce) {
        ...
    }

    public static Item createItem(String type, String id, int money) {
        Item item = createBottle(type, id, money);
        if (item == null) {
            return createEquipment(type, id, money);
        } else {
            return item;
        }
    }
}
```

### <strong>操作要求</strong>

在本次作业中，初始时，你没有需要管理的冒险者，可通过若干条操作指令来修改当前的状态：

1. 加入一个需要管理的冒险者（新加入的冒险者不携带任何药水瓶和装备，并且初始体力为 500，初始基础攻击力为 1，初始基础防御力为 0，初始魔力值为 10，初始金币数量为 50）
2. 给某个冒险者增加一个药水瓶
3. 给某个冒险者增加一个装备
4. 给某个冒险者学习一个法术
5. 删除某个冒险者的某个物品
6. 冒险者尝试携带他拥有的某个物品
7. 冒险者对一个目标使用某个可用物品
8. 冒险者去商店进行一次购买操作
9. 冒险者进行一次战斗

### <strong>输入输出格式</strong>

第一行一个整数 n，表示操作的个数。

接下来的 n 行，每行一个形如 `{type} {attribute}` 的操作，`{type}` 和 `{attribute}` 间、若干个 `{attribute}` 间使用<strong>若干</strong>个空格分割，操作输入形式及其含义如下。

以下表格中全称仅供同学们方便将指令缩写和具体指令对应，无实际作用。

如果一条指令并没有涉及到已经死亡的冒险者，那么将此指令视作“<strong>正常指令</strong>”，其输出格式如下所示。否则，将此指令视作“<strong>异常指令</strong>”，其输出格式与上一次作业保持一致。

<strong>type</strong> <strong>全称</strong> <strong>attribute</strong> <strong>意义</strong> <strong>正常情况下的输出（每条对应占一行）</strong>     `aa` add adventurer `{adv_id}` 加入一个 ID 为 `{adv_id}`的冒险者 无   `ab` add bottle `{adv_id} {bot_id} {type} {effect}` 给 ID 为 `{adv_id}` 的冒险者增加一个药水瓶，药水瓶的 ID、类型、效果值分别为 `{bot_id}`、`{type}`、`{effect}`。 无   `ae` add equipment `{adv_id} {equ_id} {type} {CE}` 给 ID 为 `{adv_id}` 的冒险者增加一个装备，装备的 ID、类型、战斗值分别为 `{equ_id}`、`{type}`、`{CE}`。 无   `ls` learn spell `{adv_id} {spe_id} {type} {manaCost} {power}` 使 ID 为 `{adv_id}` 的冒险者学习一个法术，法术的 ID，类型，魔力耗费，能力值分别为 `{spe_id}` 、`{type}` 、`{manaCost}`、`{power}` 无   `ri` remove item `{adv_id} {item_id}` 将 ID 为`{adv_id}`的冒险者的 id 为 `{item_id}` 的物品删除 `{一个字符串A}`，字符串 A 为物品的类名（答案只能在以下类名中挑选其一： `HpBottle`、`AtkBottle`、`DefBottle`、`ManaBottle`、`Sword`、`Magicbook`、`Armour`）   `ti` take item `{adv_id} {item_id}` ID 为 `{adv_id}` 的冒险者尝试携带 id 为 `{item_id}` 的物品 `{一个字符串A}`，字符串 A 为物品的类名（答案只能在以下类名中挑选其一： `HpBottle`、`AtkBottle`、`DefBottle`、`ManaBottle`、`Sword`、`Magicbook`、`Armour`）   `use` use `{adv_id} {usable_id} {target_id}` ID 为 `{adv_id}` 的冒险者尝试对 `{target_id}` 使用他拥有的 id 为`{usable_id}`的可用物品 成功：`{一个字符串} {一个整数A} {一个整数B} {一个整数C} {一个整数D}`，字符串为目标的 `id`，整数 A 为目标被作用后的体力值，整数 B 为目标被作用后的攻击力值，整数 C 为目标被作用后的防御力值 ，整数 D 为目标被作用后的魔力值。 失败：输出 `{adv_id} fail to use {usable_id}`   `bi` buy item `{adv_id} {item_id} {type}` ID 为 `{adv_id}` 的冒险者去商店购买了一件物品，其 ID 为 `{item_id}`，类型为 `{type}` `{一个整数}`，代表进行此次购买后该冒险者剩余的金币数量。   `fight` fight `{adv_id} {k}{adv_id_1}{adv_id_2}...{adv_id_k}` ID 为 `{adv_id}` 的冒险者尝试与`k`个冒险者进行一次战斗（k个冒险者的 ID 分别为 `adv_id_1`、`adv_id_2`、…、`adv_id_k`） 成功：输出一行共 `k` 个数字，其中第 `i` 个数代表 `{ID 为 adv_id_i 的冒险者受到攻击后的体力值}`，每个数之间用一个空格隔开。 失败：`Adventurer {adv_id} defeated`，其中`{adv_id}`为输入中的攻击者的 ID

对于所有的异常指令，除了需要你输出对应的信息以外，该指令<strong>不应当有任何效果</strong>。

### <strong>样例</strong>

### <strong>输入1</strong>

```
5
aa Alice
ae Alice IronSword Sword 50
ti Alice IronSword
ri Alice IronSword
bi Alice HealthPotion HpBottle
```

### <strong>输出1</strong>

```
Sword
Sword
0
```

### <strong>输入2</strong>

```
11
aa Alice
aa Bob
aa Carol
aa David
ae Alice DarkMagicBook Magicbook 1145
ti Alice DarkMagicBook
fight Alice 1 Bob
ae Alice GreatSword Sword 1145
ti Alice GreatSword
fight Alice 3 Bob Carol David
bi Alice ManaElixir ManaBottle
```

### <strong>输出2</strong>

```
Magicbook
Adventurer Alice defeated
Sword
0 0 0
100
```

### <strong>数据限制</strong>

### <strong>变量约束</strong>

<strong>变量</strong> <strong>类型</strong> <strong>说明</strong>     `id` 字符串 保证为仅包含大小写字母、数字与下划线的字符串，长度区间为 &#91;1, 40&#93;   `effect` 整数 取值范围：0 - 2147483647   `CE` 整数 取值范围：0 - 2147483647   `manaCost` 整数 取值范围：1 - 2147483647   `hitPoint` 整数 取值范围：0 - 2147483647   `atk` 整数 取值范围：1 - 1073741823   `def` 整数 取值范围：0 - 1073741823   `mana` 整数 取值范围：0 - 2147483647   `money` 整数 取值范围：0 - 2147483647

注意，变量约束指的是，在程序运行时，输入和对应属性值均保证在表格中给出的范围内。

### <strong>操作约束</strong>

1. 保证所有添加的冒险者、药水瓶、装备、法术的 id 在全局范围内均不相同，即一个 id 如果在冒险者中使用过，则不会在冒险者，药水瓶和装备中再次使用。。
2. 保证增加的冒险者、装备、药水瓶和法术在操作执行时，系统中原本不存在对应 id 的实体。
3. 保证被删除的药水瓶/装备的 id 不会再次被用于添加新的药水瓶/装备/法术/冒险者。
4. 保证 `bi` 指令中的 `{item_id}` 是一个全新且此前从未出现过的 ID。
5. 对于 `ab`, `ae`, `ls`, `ri`, `ti`, `bi` 指令，保证操作中指定的 `{adv_id}` 一定存在，但不保证其对应的冒险者存活。
6. 对于 `use` 指令，保证操作中指定的 `{adv_id}` 和 `{target_id}` 一定存在，但不保证两者对应的冒险者存活。
7. 对于 `fight` 指令，保证攻击者与被攻击者的 id 一定存在，且保证被攻击者全部存活（不会鞭尸），但不保证攻击者处于存活状态。
8. 对于 `ri` 和 `ti` 指令，保证冒险者一定拥有操作中指定 `{item_id}` 的药水瓶或装备。
9. 对于 `use` 指令，保证冒险者一定拥有指定 `{usable_id}` 的药水瓶或法术。但如果 `{usable_id}` 对应的是药水瓶，则不保证冒险者一定携带了该药水瓶。
10. `fight` 指令中被攻击的人数满足 $1≤k≤10$。
11. 总操作数 `n` 满足 $1 ≤ n ≤ 2000$。

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
