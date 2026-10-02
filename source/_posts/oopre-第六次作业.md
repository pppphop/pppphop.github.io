---
title: "oopre-第六次作业"
date: "2025-10-26 22:51:58"
updated: "2026-02-07 17:54:08"
categories:
  - "oopre"
tags:
  - "oopre"
permalink: "posts/oopre-第六次作业/"
---
# 第六次作业

### <strong>背景</strong>

本次作业核心要点包括但不限于：

- 雇佣系统实现：实现结盟关系建立、雇佣关系解除
- 目标限制：实现负面效果无法对上级生效，正面效果只能对盟友生效
- 观察者模式的使用：实现下级对上级的援助

### 雇佣关系的定义

在本次作业中，冒险者间可相互雇佣，雇佣关系是单向的。

为了辅助说明，我们这里引入”雇佣关系图“的概念。我们考虑每个冒险者最初都是一个孤立的点，则当冒险者 A 雇佣了冒险者 B 后，在雇佣关系图中，从冒险者 A 向冒险者 B 连一条有向边。当某个冒险者死去后，该点与该点相连的所有边（包括从该点连出和连入该点的边），都将从图中永久移除。

定义上级的关系为，冒险者 A 是冒险者 B 的上级当且仅当同时满足：

- 冒险者 A ，冒险者 B 皆存活
- 以下条件至少满足一条：
  - 冒险者 A 雇佣了冒险者 B
  - 存在冒险者 C，使得冒险者 A 是冒险者 C 的上级，且冒险者 C 是冒险者 B 的上级

更形象的来说，冒险者 A 是冒险者 B 的上级，当且仅当雇佣关系图中存在一条 A 到 B 的有向路径。

如果冒险者 A 是冒险者 B 的上级，我们也称冒险者 B 是冒险者 A 的下级。

我们定义冒险者的盟友集合包括他的全部上级，全部下级和他自己，如果冒险者 B 在冒险者 A 的盟友集合里，那么 B 是 A 的盟友。

我们保证，对于同一个冒险者，在同一时刻，至多会被一位冒险者雇佣。且如果冒险者 A 是冒险者 B 的上级，则冒险者 B 不会尝试去雇佣冒险者 A。

可以证明，在给定的约束下，雇佣关系图一定是一片有向森林。

### <strong>雇佣关系的约束</strong>

我们称，如果冒险者 A 的某一行为让冒险者 B 的任意属性下降（包括体力、攻击力、防御力、魔力值)，则称冒险者 A 对冒险者 B 造成了不利影响。同样的，如果冒险者 A 的某一行为让冒险者 B 的任意属性上升，则称冒险者 A 对冒险者 B 造成了有利影响。即使 A 尝试攻击 B 的行为由于一些其他原因失败了，A 的企图也是不利的，我们也称 A 对 B 造成了不利影响。

冒险者们十分注重契约关系，故当冒险者收到了一条会对其上级造成不利影响的指令，冒险者会拒绝执行该指令。在冒险者收到的攻击指令时，只要攻击目标中包含了至少一位他的上级，他都会拒绝执行该指令。以上两种情况发生时，输出`That's my boss!`。同时，如果冒险者收到的指令会对非盟友造成有利影响，冒险者同样会拒绝执行该指令，并输出`That's not my ally`。

<strong>注</strong>：`use` 指令与`fight` 指令的行为会因此而变化。对于这两个指令，需要<strong>优先判定雇佣关系</strong>是否允许该指令执行，再判定能否成功使用物品/能否战斗成功。

### 冒险者援助

如果一个冒险者在某条指令执行结束后，出现0&#60;HPnew≤⌊HPold2⌋0&#60;<em>H<strong>P</strong>n<strong>e</strong>w</em>≤⌊2<em>H<strong>P</strong>o<strong>l</strong>d</em>⌋（其中 HPold<em>H<strong>P</strong>o<strong>l</strong>d</em> 为该指令生效前的血量， HPnew<em>H<strong>P</strong>n<strong>e</strong>w</em>为该指令生效后的血量），则其<strong>所有</strong>下级会尝试对其进行一次治疗。我们称“某冒险者在一条指令生效后，其所有下级尝试对其进行治疗”的整个过程称为一次<strong>援助事件</strong>。每个下级尝试治疗的过程如下：

- 如果该下级没有学习治疗法术，治疗失败
- 将下级魔力足以释放的，且学习过的治疗法术记为一个集合 S<em>S</em> ，若 S<em>S</em> 为空，治疗失败
- 选择 S<em>S</em> 中 `power` 值最高的治疗法术（若存在多个最高的治疗法术，则取其中 `manaCost` 最小的），对援助对象进行使用，治疗成功

若援助事件发生，且被援助对象至少被一个冒险者治疗成功，则输出：`<adv_id> is helped by <adv_num> adventurer(s), now Hp is <new_hp>`。其中 `<adv_id>` 为被援助者的 `id` ，`<adv_num>` 为本次事件中<strong>治疗成功</strong>的冒险者数量，`adventurer(s)` 为固定词语，无需考虑单复数， `<new_hp>` 为援助事件结束后被援助对象的血量。

若冒险者治疗成功，则与正常使用法术相同 ，扣除相应的魔力值。

若所有援助者全部治疗失败，则不应产生与援助相关的特殊输出。

<strong>特别说明：</strong> 援助事件中，所有援助者均无需按照 `use` 指令格式输出，仅需按照上述要求输出即可。且援助事件的信息应当在原指令后输出。

### <strong>操作要求</strong>

在本次作业中，初始时，你没有需要管理的冒险者，我们通过若干条操作指令来修改当前的状态：

（<strong>新增指令 10-11，其余指令若无特殊说明，则要求和限制同上一次迭代作业</strong>）

1. 加入一个需要管理的冒险者（新加入的冒险者不携带任何药水瓶和装备，并且初始体力为 500，初始攻击力为 1，初始防御力为 0，初始魔力值为 10，初始金币数量为 50）
2. 给某个冒险者增加一个药水瓶
3. 给某个冒险者增加一个装备
4. 给某个冒险者学习一个法术
5. 删除某个冒险者的某个物品
6. 冒险者尝试携带他拥有的某个物品
7. 冒险者对一个目标使用某个可用物品
8. 冒险者去商店进行一次购买操作
9. 冒险者进行一次战斗
10. 增加一条雇佣关系
11. 删除一条雇佣关系

### <strong>输入输出格式</strong>

第一行一个整数 n，表示操作的个数。

接下来的 n 行，每行一个形如 `{type} {attribute}` 的操作，`{type}` 和 `{attribute}` 间、若干个 `{attribute}` 间使用<strong>若干</strong>个空格分割，操作输入形式及其含义如下。

以下表格中全称仅供同学们方便将指令缩写和具体指令对应，无实际作用。

如果一条指令并没有涉及到已经死亡的冒险者，那么将此指令视作“<strong>正常指令</strong>”，其输出格式如下所示。否则，将此指令视作“<strong>异常指令</strong>”，其输出格式与上一次作业保持一致。

如果某次指令触发了援助事件，请按照”冒险者援助”章节对此进行特殊输出，本部分不再赘述。

<strong>type</strong> <strong>全称</strong> <strong>attribute</strong> <strong>意义</strong> <strong>正常情况下的输出（每条对应占一行）</strong>     `aa` add adventurer `{adv_id}` 加入一个 ID 为 `{adv_id}`的冒险者 无   `ab` add bottle `{adv_id} {bot_id} {type} {effect}` 给 ID 为 `{adv_id}` 的冒险者增加一个药水瓶，药水瓶的 ID、类型、效果值分别为 `{bot_id}`、`{type}`、`{effect}`。 无   `ae` add equipment `{adv_id} {equ_id} {type} {CE}` 给 ID 为 `{adv_id}` 的冒险者增加一个装备，装备的 ID、类型、战斗值分别为 `{equ_id}`、`{type}`、`{CE}`。 无   `ls` learn spell `{adv_id} {spe_id} {type} {manaCost} {power}` 使 ID 为 `{adv_id}` 的冒险者学习一个法术，法术的 ID，类型，魔力耗费，能力值分别为 `{spe_id}` 、`{type}` 、`{manaCost}`、`{power}` 无   `ri` remove item `{adv_id} {item_id}` 将 ID 为`{adv_id}`的冒险者的 id 为 `{item_id}` 的物品删除 `{一个字符串A}`，字符串 A 为物品的类名（答案只能在以下类名中挑选其一： `HpBottle`、`AtkBottle`、`DefBottle`、`ManaBottle`、`Sword`、`Magicbook`、`Armour`）   `ti` take item `{adv_id} {item_id}` ID 为 `{adv_id}` 的冒险者尝试携带 id 为 `{item_id}` 的物品 `{一个字符串A}`，字符串 A 为物品的类名（答案只能在以下类名中挑选其一： `HpBottle`、`AtkBottle`、`DefBottle`、`ManaBottle`、`Sword`、`Magicbook`、`Armour`）   `use` use `{adv_id} {usable_id} {target_id}` ID 为 `{adv_id}` 的冒险者尝试对 `{target_id}` 使用他拥有的 id 为`{usable_id}`的可用物品 <strong>成功</strong>：`{一个字符串} {一个整数A} {一个整数B} {一个整数C} {一个整数D}`，字符串为目标的 `id`，整数 A 为目标被作用后的体力值，整数 B 为目标被作用后的攻击力值，整数 C 为目标被作用后的防御力值 ，整数 D 为目标被作用后的魔力值。<strong>失败</strong>：若不是因为雇佣关系导致的失败，输出 `{adv_id} fail to use {usable_id}` 否则，按照雇佣关系约束中的要求输出   `bi` buy item `{adv_id} {item_id} {type}` ID 为 `{adv_id}` 的冒险者去商店购买了一件物品，其 ID 为 `{item_id}`，类型为 `{type}` `{一个整数}`，代表进行此次购买后该冒险者剩余的金币数量。   `fight` fight `{adv_id} {k}{adv_id_1}{adv_id_2}...{adv_id_k}` ID 为 `{adv_id}` 的冒险者尝试与`k`个冒险者进行一次战斗（k个冒险者的 ID 分别为 `adv_id_1`、`adv_id_2`、…、`adv_id_k`） <strong>成功</strong>：输出一行共 `k` 个数字，其中第 `i` 个数代表 `{ID 为 adv_id_i 的冒险者受到攻击后的体力值}`，每个数之间用一个空格隔开。<strong>失败</strong>：若不是因为雇佣关系导致的失败，输出 `Adventurer {adv_id} defeated`，其中`{adv_id}`为输入中的攻击者的 ID，否则，按照雇佣关系约束中的要求输出   `ar` add relation `{adv_id_1}{adv_id_2}` ID 为 `{adv_id_1}` 的冒险者尝试雇佣ID 为 `{adv_id2}` 的冒险者 无   `rr` remove relation `{adv_id_1}{adv_id_2}` ID 为 `{adv_id_1}` 的冒险者尝试解除雇佣ID 为 `{adv_id2}` 的冒险者 无

对于所有的异常指令，除了需要你输出对应的信息以外，该指令<strong>不应当有任何效果</strong>。

### <strong>样例</strong>

### <strong>输入</strong>

```
15
aa King
aa Knight
aa Archer
aa Rogue
aa Goblin
ls Knight HealWave HealSpell 5 100
ls Archer FirstAid HealSpell 3 80
ar King Knight
ar Knight Archer
fight Knight 1 King
use Knight HealWave Rogue
ae Goblin SharpClaw Sword 301
ti Goblin SharpClaw
fight Goblin 1 King
fight Goblin 1 King
```

### <strong>输出</strong>

```
That's my boss!
That's not my ally
Sword
198
King is helped by 2 adventurer(s), now Hp is 378
76
King is helped by 2 adventurer(s), now Hp is 256
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
10. `fight` 指令中被攻击的人数满足 1≤k≤101≤<em>k</em>≤10。
11. 总操作数 `n` 满足 1 ≤ n ≤ 2000。
12. 保证对于同一个冒险者，在同一时刻，至多会被一位冒险者雇佣。且如果冒险者 A 是冒险者 B 的上级，则冒险者 B 不会尝试去雇佣冒险者 A。
13. 保证 `ar` 指令条数小于等于 500

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
