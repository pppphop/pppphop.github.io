---
title: "oopre-第七次作业"
date: "2025-11-05 13:54:27"
updated: "2026-02-07 17:57:10"
categories:
  - "oopre"
tags:
  - "oopre"
permalink: "posts/oopre-第七次作业/"
---
# 第七次作业

本次作业将是面向对象先导课程的最后一次代码作业。本次作业无业务上的变动，只需引入一条新指令：

- `lr` 指令解析：利用递归下降，实现批量导入指令的功能。

### `lr` 指令

`lr` 指令，即 `load relationship`，其可以在一次操作中，传递树形雇佣关系图，导入复杂的冒险者关系。

如果导入的关系中冒险者A雇佣了B和C，那么我们可以用 `A(B,C)` 来表示，在这里，如果B又雇佣了其他人，则B也可以替换为相应的含有小括号的形式。

，我们以一个例子展开：

```
lr 1(2, 3(4, 5), 6(7, 8(9)))
```

该指令表示1雇佣了2，3，6；3雇佣了4，5；6雇佣了7，8；8雇佣了9。

该指令的参数有严格的形式化定义，输入时为 `lr 冒险者` 的形式，`lr` 和 `冒险者` 之间可以间隔任意空白字符（至少有一个），冒险者的定义见下方形式化定义。

<strong>形式化表述：</strong>

- 冒险者 → 标识符 &#91;被雇佣者&#93;
- 被雇佣者 → `'('` 冒险者序列 `')'`
- 冒险者序列 → 冒险者 {`','` 冒险者}
- 标识符 → 数字 | 字母 | ‘&#95;’ &#91;标识符&#93;
- 数字 → ‘0’ | ‘1’ … ‘9’
- 字母 → ‘a’ | ‘b’ … | ‘z’ | ‘A’ | ‘B’ …| ‘Z’ 其中
- `{}` 表示允许存在 0 个、1 个或多个。
- `[]` 表示允许存在 0 个或 1 个。

<strong>数据约定</strong>

`lr` 指令的数据约束如下：

- 保证指令中出现的所有冒险者都存在且存活。
- 保证进行该指令后，一定能满足对于雇佣关系的约束，即一位冒险者同一时刻只有一个上级，且不会尝试雇佣他的上级。
- 保证目前已经有的雇佣关系不会被重复添加。
- 保证将 `lr` 指令以任何顺序拆成 `ar` 指令后，均满足对于 `ar` 指令的约束

<strong>提示：</strong>

请同学们尝试使用第六次作业中介绍的递归下降的方法，来尝试实现该指令。为了减轻同学们的作业负担，我们已经为同学们写好了 Lexer，剩下的部分需要同学们自行完善。

注意，该 Lexer 是对 `lr` 后方的参数进行词法分析，请同学们使用时不要传入 `lr` 这两个字符。

```
public class Lexer {
    private final String input;
    private int pos = 0;
    private String curToken;

    private String removeWhitespace(String s) {
        return s.replaceAll("\\s+", "");
    }

    public Lexer(String input) {
        this.input = removeWhitespace(input);
        next();
    }

    private boolean isIDChar(char c) {
        return Character.isLetter(c) || Character.isDigit(c) || c == '_';
    }

    private String getID() {
        StringBuilder sb = new StringBuilder();
        while (pos < input.length() && /*TODO:1*/) {
            sb.append(input.charAt(pos));
            ++pos;
        }
        return sb.toString();
    }

    public void next() {
        if (pos == input.length()) {
            curToken = null;
            return;
        }
        char c = input.charAt(pos);
        if (isIDChar(c)) {
            curToken = getID();
        }
        else if (/*TODO:2*/) {
            pos += 1;
            curToken = String.valueOf(c);
        }
        else {
            throw new RuntimeException("Unexpected character: " + c);
        }
    }

    public String peek() {
        return curToken;
    }
}
```

### <strong>操作要求</strong>

在本次作业中，初始时，你没有需要管理的冒险者，我们通过若干条操作指令来修改当前的状态：

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
12. 导入一组雇佣关系

### <strong>输入输出格式</strong>

第一行一个整数 n，表示操作的个数。

接下来的 n 行，每行一个形如 `{type} {attribute}` 的操作，`{type}` 和 `{attribute}` 间、若干个 `{attribute}` 间使用<strong>若干</strong>个空格分割，操作输入形式及其含义如下。

以下表格中全称仅供同学们方便将指令缩写和具体指令对应，无实际作用。

如果一条指令并没有涉及到已经死亡的冒险者，那么将此指令视作“<strong>正常指令</strong>”，其输出格式如下所示。否则，将此指令视作“<strong>异常指令</strong>”，其输出格式与上一次作业保持一致。

<strong>type</strong> <strong>全称</strong> <strong>attribute</strong> <strong>意义</strong> <strong>正常情况下的输出（每条对应占一行）</strong>     `aa` add adventurer `{adv_id}` 加入一个 ID 为 `{adv_id}`的冒险者 无   `ab` add bottle `{adv_id} {bot_id} {type} {effect}` 给 ID 为 `{adv_id}` 的冒险者增加一个药水瓶，药水瓶的 ID、类型、效果值分别为 `{bot_id}`、`{type}`、`{effect}`。 无   `ae` add equipment `{adv_id} {equ_id} {type} {CE}` 给 ID 为 `{adv_id}` 的冒险者增加一个装备，装备的 ID、类型、战斗值分别为 `{equ_id}`、`{type}`、`{CE}`。 无   `ls` learn spell `{adv_id} {spe_id} {type} {manaCost} {power}` 使 ID 为 `{adv_id}` 的冒险者学习一个法术，法术的 ID，类型，魔力耗费，能力值分别为 `{spe_id}` 、`{type}` 、`{manaCost}`、`{power}` 无   `ri` remove item `{adv_id} {item_id}` 将 ID 为`{adv_id}`的冒险者的 id 为 `{item_id}` 的物品删除 `{一个字符串A}`，字符串 A 为物品的类名（答案只能在以下类名中挑选其一： `HpBottle`、`AtkBottle`、`DefBottle`、`ManaBottle`、`Sword`、`Magicbook`、`Armour`）   `ti` take item `{adv_id} {item_id}` ID 为 `{adv_id}` 的冒险者尝试携带 id 为 `{item_id}` 的物品 `{一个字符串A}`，字符串 A 为物品的类名（答案只能在以下类名中挑选其一： `HpBottle`、`AtkBottle`、`DefBottle`、`ManaBottle`、`Sword`、`Magicbook`、`Armour`）   `use` use `{adv_id} {usable_id} {target_id}` ID 为 `{adv_id}` 的冒险者尝试对 `{target_id}` 使用他拥有的 id 为`{usable_id}`的可用物品 <strong>成功</strong>：`{一个字符串} {一个整数A} {一个整数B} {一个整数C} {一个整数D}`，字符串为目标的 `id`，整数 A 为目标被作用后的体力值，整数 B 为目标被作用后的攻击力值，整数 C 为目标被作用后的防御力值 ，整数 D 为目标被作用后的魔力值。<strong>失败</strong>：若不是因为雇佣关系导致的失败，输出 `{adv_id} fail to use {usable_id}` 否则，按照雇佣关系约束中的要求输出   `bi` buy item `{adv_id} {item_id} {type}` ID 为 `{adv_id}` 的冒险者去商店购买了一件物品，其 ID 为 `{item_id}`，类型为 `{type}` `{一个整数}`，代表进行此次购买后该冒险者剩余的金币数量。   `fight` fight `{adv_id} {k}{adv_id_1}{adv_id_2}...{adv_id_k}` ID 为 `{adv_id}` 的冒险者尝试与`k`个冒险者进行一次战斗（k个冒险者的 ID 分别为 `adv_id_1`、`adv_id_2`、…、`adv_id_k`） <strong>成功</strong>：输出一行共 `k` 个数字，其中第 `i` 个数代表 `{ID 为 adv_id_i 的冒险者受到攻击后的体力值}`，每个数之间用一个空格隔开。<strong>失败</strong>：若不是因为雇佣关系导致的失败，输出 `Adventurer {adv_id} defeated`，其中`{adv_id}`为输入中的攻击者的 ID，否则，按照雇佣关系约束中的要求输出   `ar` add relation `{adv_id_1}{adv_id_2}` ID 为 `{adv_id_1}` 的冒险者尝试雇佣ID 为 `{adv_id2}` 的冒险者 无   `rr` remove relation `{adv_id_1}{adv_id_2}` ID 为 `{adv_id_1}` 的冒险者尝试解除雇佣ID 为 `{adv_id2}` 的冒险者 无   `lr` load relation `冒险者` （详见上方形式化定义部分） 导入雇佣关系图，详见上方 `lr` 指令部分 无

对于所有的异常指令，除了需要你输出对应的信息以外，该指令<strong>不应当有任何效果</strong>。

### <strong>样例</strong>

### <strong>输入</strong>

```
18
aa King
aa Knight
aa Archer
aa Rogue
aa Mage
ls Knight HealWave HealSpell 5 100
ls Archer FirstAid HealSpell 3 80
ls Mage ManaShield HealSpell 4 90
lr King(Knight(Archer), Rogue)
ae Mage Staff Sword 250
ti Mage Staff
fight Mage 1 King
use Knight HealWave King
rr King Rogue
fight Rogue 1 King
lr Archer(Rogue)
use Archer FirstAid Rogue
fight Knight 1 King
```

### <strong>输出</strong>

```
Sword
249
King is helped by 2 adventurer(s), now Hp is 429
King 529 1 0 10
528
Rogue 580 1 0 10
That's my boss!
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
12. 保证对于同一个冒险者，在同一时刻，至多会被一位冒险者雇佣。且如果冒险者 A 处于被雇佣的状态，不会有任何一个人尝试雇佣他。
13. 保证 `ar` 指令条数小于等于 500
14. 保证 `rr` 指令不会解雇未被雇佣的冒险者
15. `fight` 指令保证不会攻击自己，且攻击目标各不相同
