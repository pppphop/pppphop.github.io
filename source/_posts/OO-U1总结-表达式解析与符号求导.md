---
title: "OO U1总结：表达式解析与符号求导"
date: "2026-04-02 20:00:00"
updated: "2026-06-27 13:34:25"
categories:
  - "OO"
tags:
  - "OO"
permalink: "posts/OO-U1总结-表达式解析与符号求导/"
---
## 本单元题面

[第一次作业题面](/files/面向对象设计与构造第一次作业.html) [第二次作业题面](/files/面向对象设计与构造第二次作业.html) [第三次作业题面](/files/面向对象设计与构造第三次作业.html)

---

# OO U1总结：从单变量解析到多元符号求导的架构演进

本单元的核心任务是实现一个表达式解析与化简程序。历经三次迭代，需求从最初的单变量括号展开，逐步升级为支持嵌套指数函数、自定义函数调用、选择式因子，最终扩展至双变量及符号求偏导。这一过程不仅是对 Java 语法的熟悉，更是对面向对象设计思想的深度实践。

## 一、 程序结构与基于度量的分析

在本单元的最终代码中，我采用了典型的递归下降与抽象语法树（AST）相结合的架构。

## 1. 代码规模与经典 OO 度量分析

基于最终的作业代码，我使用Metrics插件对核心类进行了分析：

类 OCavg OCmax WMC     DerivationFactor 2.5 4.0 5.0   ExpFactor 1.5 2.0 3.0   Expr 1.5 3.0 6.0   FuncFactor 1.0 1.0 2.0   Lexer 4.0 10.0 12.0   MainClass 2.5 5.0 15.0   Mono 2.857142857142857 11.0 20.0   Number 1.0 1.0 2.0   Parser 3.111111111111111 7.0 28.0   Poly 3.9375 8.0 63.0   SelectFactor 1.5 2.0 3.0   Term 1.5 3.0 6.0   Variable 2.0 3.0 4.0   Total   169.0   Average 2.7704918032786887 4.615384615384615 13.0

<strong>类名</strong> <strong>属性数</strong> <strong>方法数</strong> <strong>平均方法规模(LOC)</strong> <strong>核心方法圈复杂度(CC)</strong> <strong>类总代码规模(LOC)</strong> <strong>耦合度</strong> <strong>内聚度</strong>     `Lexer` 3 3 15 `next`: 8 &#126;60 低 高   `Parser` 2 8 15 `parseFactor`: 10 &#126;140 中 高   `Poly` 1 11 20 `substitute`: 6, `mul`: 4 &#126;180 高 中   `Mono` 3 5 12 `toString`: 8 &#126;90 中 高   `Expr` / `Term` 2 4 8 `toPoly`: 2 &#126;40 低 高   `SelectFactor`等 2&#126;4 2 6 `toPoly`: 2 &#126;30 低 高

<strong>OCavg</strong>：类中所有方法的平均圈复杂度（Average Operation Complexity），反映该类内部各个方法的平均逻辑分支复杂程度。

<strong>OCmax</strong>：类中所有方法的最大圈复杂度（Maximum Operation Complexity），代表该类中最复杂、最难维护的那个方法的复杂度。

<strong>WMC</strong>：类的总加权方法复杂度（Weighted Methods per Class），通常是类中所有方法圈复杂度之和，用于衡量一个类的整体规模和复杂性。

<strong>内聚与耦合情况点评：</strong>

- <strong>高内聚低耦合：</strong> `Expr`, `Term` 以及 `Factor` 接口的众多实现类（如 `ExpFactor`, `DerivationFactor`, `SelectFactor` 等）具有极高的内聚度。它们只负责保存自身的语法结构，并对外提供统一的 `toPoly()` 接口。它们相互之间通过接口耦合，符合依赖倒置原则。比如 `SelectFactor` 的条件判断直接复用了 `pa.sub(pb).isEmpty()`，非常优雅。
- <strong>复杂度与耦合的集中点（`Poly` 与 `Parser`）：</strong> `Parser` 集中了所有的语法规则解析逻辑，随着文法增加，`parseFactor` 的 `if-else` 分支逐渐增多，圈复杂度不可避免地上升。

 `Poly` 是计算核心，负责多项式的加减乘、代入（`substitute`）以及 GCD 提取。它与 `Mono` 存在强耦合，承担了较重的计算逻辑。

## 2. 架构类图与设计考虑

架构图如下，文字解释见本节最后

![](/posts/OO-U1%E6%80%BB%E7%BB%93-%E8%A1%A8%E8%BE%BE%E5%BC%8F%E8%A7%A3%E6%9E%90%E4%B8%8E%E7%AC%A6%E5%8F%B7%E6%B1%82%E5%AF%BC/U1.drawio.png)

方法 CogC ev(G) iv(G) v(G)     DerivationFactor.DerivationFactor(String, Factor) 0.0 1.0 1.0 1.0   ExpFactor.ExpFactor(Factor, BigInteger) 0.0 1.0 1.0 1.0   Expr.Expr() 0.0 1.0 1.0 1.0   Expr.addTerm(Term) 0.0 1.0 1.0 1.0   Expr.setExponent(BigInteger) 0.0 1.0 1.0 1.0   FuncFactor.FuncFactor(Factor, Poly) 0.0 1.0 1.0 1.0   FuncFactor.toPoly() 0.0 1.0 1.0 1.0   Lexer.Lexer(String) 0.0 1.0 1.0 1.0   Lexer.peek() 0.0 1.0 1.0 1.0   MainClass.parseNormalFunc(String, Map) 0.0 1.0 1.0 1.0   MainClass.preprocess(String) 0.0 1.0 1.0 1.0   Mono.Mono(BigInteger, BigInteger, Poly) 0.0 1.0 1.0 1.0   Mono.getExpPoly() 0.0 1.0 1.0 1.0   Mono.getExpX() 0.0 1.0 1.0 1.0   Mono.getExpY() 0.0 1.0 1.0 1.0   Number.Number(BigInteger) 0.0 1.0 1.0 1.0   Number.toPoly() 0.0 1.0 1.0 1.0   Parser.Parser(Lexer, Map) 0.0 1.0 1.0 1.0   Parser.parseDerivationFactor() 0.0 1.0 1.0 1.0   Parser.parseSelectFactor() 0.0 1.0 1.0 1.0   Poly.Poly() 0.0 1.0 1.0 1.0   Poly.hashCode() 0.0 1.0 1.0 1.0   Poly.isEmpty() 0.0 1.0 1.0 1.0   SelectFactor.SelectFactor(Factor, Factor, Factor, Factor) 0.0 1.0 1.0 1.0   Term.Term() 0.0 1.0 1.0 1.0   Term.addFactor(Factor) 0.0 1.0 1.0 1.0   Term.setNegative() 0.0 1.0 1.0 1.0   Variable.Variable(String, BigInteger) 0.0 1.0 1.0 1.0   ExpFactor.toPoly() 1.0 2.0 2.0 2.0   MainClass.collapseSigns(String) 1.0 1.0 2.0 2.0   MainClass.generateRecurSequence(String, Map) 1.0 1.0 2.0 2.0   Mono.hashCode() 1.0 1.0 2.0 2.0   Parser.parseFuncFactor() 1.0 1.0 2.0 2.0   Parser.parseTerm() 1.0 1.0 2.0 2.0   Poly.divide(BigInteger) 1.0 1.0 2.0 2.0   SelectFactor.toPoly() 1.0 2.0 2.0 2.0   Expr.toPoly() 2.0 2.0 3.0 3.0   Poly.add(Poly) 2.0 1.0 3.0 3.0   Poly.equals(Object) 2.0 3.0 1.0 3.0   Variable.toPoly() 2.0 1.0 3.0 3.0   DerivationFactor.toPoly() 3.0 4.0 4.0 4.0   MainClass.main(String&#91;&#93;) 3.0 2.0 3.0 4.0   Mono.equals(Object) 3.0 3.0 3.0 5.0   Parser.parseNumber() 3.0 1.0 4.0 4.0   Parser.parseOptExp() 3.0 2.0 3.0 3.0   Poly.addTerm(Mono, BigInteger) 3.0 2.0 2.0 3.0   Poly.sub(Poly) 3.0 2.0 3.0 4.0   Term.toPoly() 3.0 3.0 2.0 3.0   MainClass.parseRecurFunc(String, String, String, Map) 5.0 1.0 4.0 5.0   Poly.mul(Poly) 5.0 2.0 4.0 5.0   Poly.pow(BigInteger) 6.0 2.0 4.0 5.0   Poly.getgcd() 7.0 2.0 4.0 6.0   Poly.substitute(Poly) 7.0 1.0 5.0 5.0   Poly.toString() 8.0 6.0 5.0 7.0   Parser.parseExpr() 9.0 1.0 7.0 8.0   Poly.formatTerm(BigInteger, Mono, boolean) 9.0 1.0 7.0 7.0   Parser.parseFactor() 10.0 7.0 10.0 10.0   Poly.derive(String) 11.0 1.0 8.0 8.0   Lexer.next() 13.0 2.0 9.0 13.0   Mono.toString() 18.0 2.0 9.0 12.0   Poly.toFactorString() 19.0 8.0 7.0 16.0   Total 167.0 100.0 161.0 193.0   Average 2.737704918032787 1.639344262295082 2.639344262295082 3.1639344262295084

<strong>CogC</strong>：认知复杂度（Cognitive Complexity），衡量代码对人类阅读和理解的困难程度，嵌套结构越深、控制流越不直观，该值越高。

<strong>ev(G)</strong>：基本圈复杂度（Essential Cyclomatic Complexity），衡量代码中非结构化控制流（如随意使用的 break、continue、return 等）的复杂程度。

<strong>iv(G)</strong>：设计复杂度（Design Complexity），衡量一个方法调用其他方法时的控制流耦合程度，反映该方法与其他模块的交互复杂性。

<strong>v(G)</strong>：McCabe 圈复杂度（Cyclomatic Complexity），衡量方法内部独立执行路径的数量，即 `if/for/while` 等条件分支的总数加一。

<strong>设计考虑与自我点评：</strong>

<strong>优点（分离解析与计算）：</strong> 整个系统被严格切分为“解析层（Parser + Lexer）”和“计算底座（Poly + Mono 模型）”。上层的 `Factor` 无论多么复杂，只要实现了 `toPoly()`，底层数学模型都不需要关心它是怎么来的。

<strong>优点（规范的底层模型）：</strong> 采用 `Map<Mono, BigInteger>` 存储多项式。配合重写 `Mono` 的 `equals` 和 `hashCode`，实现了在 `addTerm` 时自动完成同类项合并（$O(1)$ 查找），天然保持了多项式的最简形式。

<strong>缺点：</strong> `Poly` 类有些过于臃肿。输出格式化（`toString`、提取 gcd 等）和核心的代数运算混杂在一个类中，如果后续还要支持更复杂的输出格式，应当将其抽离为一个独立的 `Printer` 类。

<strong>文字解释：</strong>

#### i、 解析与控制层（Parsing & Control Module）

这部分类的设计遵循了<strong>单一职责原则</strong>，将输入处理、词法提取和语法树构建严格解耦。

<strong>`MainClass`（主控与预处理）</strong>

<strong>设计考虑：</strong> 作为程序的入口，它专门负责流程编排和 I/O 交互。为了减轻后续解析器的负担，设计了 `preprocess` 和 `collapseSigns` 方法进行字符串级别的预处理（如去除空白符、合并连续的正负号）。此外，将自定义函数（普通函数和递推函数）的解析逻辑集中在此处，并在解析主表达式前构建好 `functions` 字典，确保了解析过程的环境隔离。

<strong>`Lexer`（词法分析器）</strong>

<strong>设计考虑：</strong> 充当解析过程中的“分词器”。它的存在将复杂的长字符串抽象为一个个具有独立语义的 Token（如算子、数字、变量）。这种设计隔离了底层字符串操作的指针移动逻辑，使得语法解析器不需要关心字符是如何拼接的，提高了代码的可维护性和复用性。

<strong>`Parser`（语法分析器）</strong>

<strong>设计考虑：</strong> 采用了<strong>递归下降子程序法（Recursive Descent）</strong>。将表达式的文法拆解为 `parseExpr`、`parseTerm` 和 `parseFactor` 等独立方法，完美映射了形式语言的文法规则。通过引入 `functions` 字典，使得语法树在构建阶段就能直接绑定对应的函数逻辑。当未来文法规则扩展时，只需在对应层级添加解析分支，符合开闭原则 。

#### ii、 抽象语法树层（AST - Abstract Syntax Tree Module）

该模块是面向对象特性的核心体现，深度运用了<strong>组合模式（Composite Pattern）\</strong>和&#42;<em>多态机制&#42;</em>。

<strong>`Factor`（因子接口）</strong>

<strong>设计考虑：</strong> 系统的核心抽象。定义了统一的行为契约 `toPoly()`，使得所有具体的表达式节点（无论多复杂）最终都可以被转化为标准的多项式（Poly）。这为上层的表达式求值提供了极大的便利，调用方无需关心具体的因子类型，利用<strong>多态</strong>即可完成统一处理。

<strong>`Expr`（表达式节点）</strong>

<strong>设计考虑：</strong> 作为组合模式中的“容器节点”，代表多个 `Term` 的加减组合。内部使用 `ArrayList<Term>` 来管理子节点，并维护了自己的指数属性（Exponent）。其 `toPoly()` 方法负责将内部项求和后再进行次幂运算，封装了表达式级别的数学逻辑。

<strong>`Term`（项节点）</strong>

<strong>设计考虑：</strong> 同样属于“容器节点”，代表多个 `Factor` 的乘积组合。通过 `addFactor()` 动态聚合不同的因子。考虑到项级别的负号问题，设计了 `setNegative()` 方法巧妙地向列表中追加一个 `-1` 的 `Number` 因子，简化了符号计算的复杂度。

<strong>`Number`（常数因子节点）</strong>

<strong>设计考虑：</strong> 语法树的“叶子节点”。封装了 `BigInteger` 类型的常数。在向多项式转化时，将其自身映射为一个指数全为 0 的单项式，保证了多项式引擎计算的统一性。

<strong>`Variable`（变量因子节点）</strong>

<strong>设计考虑：</strong> 语法树的“叶子节点”，代表自变量 `x` 或 `y`。通过内部状态 `name` 区分变量类型，在转化时精准地将指数分配给对应变量所在的单项式维度。

<strong>`ExpFactor`（指数函数因子）</strong>

<strong>设计考虑：</strong> 封装了 `exp(...)` 的逻辑。设计上将括号内的参数抽象为一个独立的 `Factor`，体现了递归嵌套的架构思想。在计算时，先将内部参数转为多项式，再整体包裹为以 `exp` 为底的指数形式。

<strong>`FuncFactor`（自定义函数因子）</strong>

<strong>设计考虑：</strong> 充当了函数调用的代理节点。内部不仅保存了实参（`args`），还直接持有从字典中获取的函数定义（`funcPoly`）。在求值阶段，直接调用底层的代入替换方法（`substitute`），将解析与计算完美分离。

<strong>`DerivationFactor`（求导算子因子）</strong>

<strong>设计考虑：</strong> 封装了偏导数（`dx`, `dy`）和梯度（`grad`）算子的逻辑。内部组合了一个目标表达式（`expr`）。通过将求导操作延迟到 `toPoly()` 阶段，直接复用底层多项式强大的求导机制，避免了在树节点层面上进行复杂的链式求导。

<strong>`SelectFactor`（条件选择因子）</strong>

<strong>设计考虑：</strong> 专门处理三元条件分支 `[(A==B)?C:D]`。在类内部保存四个独立的分支因子，在 `toPoly()` 时动态计算 A 和 B 的多项式差值。如果差值为空（即相等），则走 C 分支，否则走 D 分支，实现了逻辑判断在多项式层面的平滑过渡。

#### iii、 底层数学引擎层（Mathematical Engine Module）

该模块负责最终代数运算，设计上追求数据的规范化表示和不可变性特征。

<strong>`Poly`（多项式类）</strong>

<strong>设计考虑：</strong> 这是整个计算体系的核心引擎。使用 `Map<Mono, BigInteger>`（单项式到系数的映射）来存储数据，这种设计天然实现了<strong>同类项的自动合并</strong>，极大地优化了计算效率。提供了高内聚的代数运算方法（加、减、乘、乘方、求导、代入）。其设计保证了只要语法树能转化为 `Poly`，任何复杂的嵌套计算都能被正确降维。

<strong>`Mono`（单项式类）</strong>

<strong>设计考虑：</strong> 充当哈希表中的 Key，代表最基础的代数单元 `x^a * y^b * exp(Poly)`。为了确保放入 `HashMap` 的安全性，严格重写了 `equals()` 和 `hashCode()`。通过缓存字符串表示（`strCache`）和哈希值（`hashCache`），大幅度降低了在高频对象比较和打印过程中的性能消耗。

## 二、 架构设计体验与演进

### 1. 架构的逐步成型与重构体验

<strong>第一次作业：</strong> 确立了 `Lexer -> Parser -> AST -> Poly` 的单向数据流。最初底层只需考虑 $x$ 的指数和系数。

<strong>第二次作业：</strong> 引入 `exp` 和自定义函数。架构的优势显现：我只需新增 `ExpFactor` 和 `FuncFactor`，并在底层的项结构中引入 `Mono` 类（包含 `expX` 和 `expPoly`）。函数代入直接转化为数学上的 `funcPoly.substitute(args.toPoly())` 操作，实现了符号计算降维打击，完全规避了字符串替换的括号灾难。无需进行伤筋动骨的重构。

<strong>第三次作业：</strong> 引入双变量和求偏导。在底层扩展属性，并在 `Poly` 中新增 `derive(String var)` 方法。AST 层的 `DerivationFactor` 只需要无脑调用内部表达式对应 Poly 的 `derive` 即可，充分体现分治思想体现。

### 2. 新迭代情景与可扩展性分析

<strong>新情景设定：</strong> 假设还有第四次作业，要求支持三角函数 `sin(因子)` 和 `cos(因子)`，以及应用 $\sin^2(x) + \cos^2(x) = 1$ 的化简。

<strong>可扩展性说明：</strong>

当前架构具有极强的扩展性。我只需：

1. 在 AST 层新增 `SinFactor` 和 `CosFactor`。
2. 在底层 `Mono` 中新增 `Poly sinPoly` 和 `Poly cosPoly` 属性。
3. 三角函数的解析和合并可以直接复用当前 `expPoly` 的处理逻辑（依靠重写 `hashCode`）。唯独三角恒等式的化简需要在 `Poly` 的合并逻辑中增加一次特殊的遍历尝试提取公因式，整体架构完全承接得住。

---

## 三、 Bug 分析与修复

#### 1. 第二次作业：缺少记忆化导致的 TLE

<strong>问题特征与测试用例：</strong> 在第二次作业的互测中，遇到了严重的 TLE（运行超时）问题。导致超时的典型测试用例如下：

```
1
f(x)=exp(exp(exp(exp(exp(exp(x)^2)^2)^2)^2)^2)^2
f(f(f(f(x))))
```

<strong>问题所在的类和方法：</strong> `Mono` 类的 `toString()` 方法（以及连带的 `hashCode()` 等频繁调用的底层方法）。

<strong>出现问题的原因：</strong> 在面对极深层次的 `exp` 嵌套和多次函数代入时，多项式展开后会产生海量结构相同或相似的 `Mono`（单项式）对象。在未进行优化前，每次调用多项式的打印或是将其存入 `HashMap` 时，`Mono` 都会重新走一遍极度复杂的字符串拼接逻辑（递归调用内部 `expPoly` 的 `toString`）。这种<strong>重复计算</strong>导致时间开销呈指数级爆炸。

<strong>更好的设计与修复：</strong> 在第三次作业中，我引入了<strong>记忆化（Caching）机制</strong>。由于 `Mono` 本质上是一个不可变对象（Immutable），一旦构造完成，其状态就不再改变。因此，我在 `Mono` 类中新增了 `private String strCache = null;` 和 `private int hashCache = 0;`。在 `toString()` 方法开头直接判断 `if (strCache != null) { return strCache; }`。这个符合面向对象“状态封装”的设计，直接将复杂度从重复递归降到了 $O(1)$ 的读取，完美解决了 TLE。

#### 2. 第三次作业：快速幂算法中的冗余计算导致的 TLE

<strong>问题特征与测试用例：</strong> 在第三次作业中，虽然加入了记忆化，但在面对项数极多的多项式相乘时，依然出现了 TLE。杀手用例如下：

```
0
0
(9+x)*(9+y)*(9+x^2)*(9+y^2)*(9+x^4)*(9+y^4)*(9+x^8)*(9+y^8)*(9+exp(x)+exp(y))*(9+exp(x^2))+dx(x^2)
```

<strong>问题所在的类和方法：</strong> `Poly` 类的 `pow(BigInteger n)` 方法。

<strong>出现问题的原因：</strong> 在实现多项式的快速幂时，我使用了经典的 `while` 循环移位算法。Bug 出在循环的最后一步：当 `exp` 已经被右移为 0（即 `exp.compareTo(BigInteger.ZERO) == 0`）时，程序依然会“惯性”地执行一次 `base = base.mul(base);`。对于上述测试用例，多项式相乘后的项数是呈组合数级增长的。最后一次毫无必要的 `base` 自乘，实际上是在对两个极其庞大的多项式进行笛卡尔积运算，时间消耗巨大。

<strong>更好的设计与修复：</strong> 修复方式非常简单但极为关键，只需在底数自乘前加一个条件判断：

```
exp = exp.shiftRight(1);
// 修复点：如果指数已经为0，坚决不再进行昂贵的 base 自乘运算
if (exp.compareTo(BigInteger.ZERO) > 0) { 
    base = base.mul(base);
}
```

从设计角度反思，这提醒我在处理底层基础类（如 `Poly`）的运算时，必须对<strong>边界条件</strong>（特别是循环退出前的最后一次操作）保持极高的敏感度，避免“无用功”。

#### 3. Bug 方法与无 Bug 方法的复杂度差异分析

<strong>差异对比：</strong> 对比上述出现过 Bug 的 `Poly.pow()`、`Mono.toString()` 方法，与那些几乎从未出错的简单方法（如 `Number.toPoly()` 或 `Term.setNegative()`），最大的差异在于<strong>代码行数</strong>与<strong>控制分支数目（圈复杂度）</strong>。出错的方法往往包含了复杂的 `while` 循环、深层的 `if-else` 分支以及隐式的递归调用。圈复杂度过高导致我在编写时很难在脑海中穷举所有执行路径，例如 `pow` 循环结束时的那一次多余执行。

<strong>降低复杂度的方式：</strong>

1.<strong>提炼方法（Extract Method）：</strong> 将复杂的逻辑拆解。例如 `Mono.toString()` 中拼接 x、拼接 y、处理 exp 的逻辑可以分别拆成小方法。

2.<strong>快速失败/提前返回（Early Return）：</strong> 就像 `strCache` 的优化一样，在方法开头处理掉特殊情况和缓存命中，减少嵌套深度，这能极大地降低后续阅读和维护的负担。

---

## 四、 互测与发现 Bug 的策略

在三次作业的互测环节中，我主要采用了<strong>“AI 静态代码审查 + 自身痛点复用 + 构造极端边界 + 同学交流互换”</strong>的综合策略，取得了非常精准的 Hack 效果。

#### 1. 借助大模型进行静态代码审查

拿到同房间同学的代码后，我不会立刻盲目跑评测机，而是先将对方的核心解析类（如解析器和因子类）喂给 AI，辅助我快速理解对方的架构，并寻找潜在的逻辑漏洞。比如检查对方的条件表达式判定是否完善，或者解析连续符号时会不会数组越界。这种白盒找 Bug 的方式往往能一针见血。

#### 2. 利用自己被 Hack 的点“反向输出”

我在开发和强测中踩过的性能陷阱，往往也是房间里其他同学的盲区。例如我在第二次和第三次作业中遭遇了因为缺少记忆化和多余的自乘导致的 TLE，我便直接将导致我超时的杀手级数据投入互测房间：

```
1
f(x)=exp(exp(exp(exp(exp(exp(x)^2)^2)^2)^2)^2)^2
0
f(f(f(f(x))))
```

如果对方的代码没有像我在 `Mono` 类里那样做好缓存，或者在处理多项式快速幂时没有剔除冗余计算，这个极深层次的 `exp` 嵌套用例会直接让对方运行超时TLE。

#### 3. 构造极端边界数据：针对选择因子的“惰性求值”

针对第二次作业的选择因子 `[(条件)?表达式1:表达式2]`，我专门构造了包含巨大计算量的边界测试点：

```
1
f(x)=x+2*x^2+3*x^3+4*x^4+8*x^8*exp(x)
[(x==1)?f(f(f(f(f(f(f(f(f(x))))))))):f((x+1))]
```

在我的 `SelectFactor` 类设计中，我采用了<strong>“惰性求值”</strong>的策略：先计算 `pa.sub(pb).isEmpty()`，如果为真才 `return cc.toPoly()`，否则 `return dd.toPoly()`。但很多同学在解析时会提前把 true 和 false 两个分支的多项式全都展开计算一遍。当条件为假时，去强行展开 9 层嵌套的 `f(x)` 会产生天文数字级的项，从而直接 TLE。

#### 4. 与同学讨论交换数据点：聚焦复杂嵌套与递推

通过与同学交流，我们发现互相交换极端数据点能极大地拓宽测试覆盖面。在第三次作业中，我重点收集并测试了以下两类非常容易出错的嵌套场景：

<strong>递推函数与对象相等性判断结合：</strong>

```
0
1
f{0}(x)=(x+1)^2
f{1}(x)=(x+1)^2
f{n}(x)=1*f{n-1}(x)+1*f{n-2}(x)
[(f{5}((x+y))==f{5}((x+y)))?x:y]
```

这个用例不仅考验了对方对递推函数的处理能力（我的 `MainClass` 中采用了自底向上的文本替换生成 `f2` 到 `f5`，非常稳健），还极限施压了底层类的 `equals` 方法。如果对方的多项式合并存在一丝缺陷，这个判断就会出错。

<strong>括号匹配与解析器：</strong>

```
0
0
[(0==0)?exp([(0==0)?1:0]):1]
```

这个用例将选择因子 `[...]` 嵌套进了 `exp()` 中，再套入外层选择因子。它专门用来攻击那些不用正规递归下降，而是试图用简单的字符串截取来解析括号的代码。状态机稍微错乱，就会抛出异常。

## 五、 性能优化经验

在表达式化简这部分，我没有去追求那些极其复杂且容易出错的深度化简，比如选择最短的因式，而是贯彻了<strong>“高性价比”</strong>的原则。我所做的优化主要集中在两个方面：<strong>提取最大公约数（GCD）</strong> 和 <strong>正项提前</strong>。

#### 1. 做了什么优化，怎么做的

<strong>提取指数中的最大公约数（GCD 提取）：</strong>

在处理 `exp(...)` 时，由于指数的运算法则 $e^{a \cdot b} = (e^a)^b$，如果内部多项式的各项系数存在大于 1 的最大公约数，我们可以将其提取到外部作为整个 `exp` 块的指数。

<strong>实现方式：</strong> 在 `Mono` 类的 `toString()` 方法中，我实现了比较逻辑。首先生成默认的 `bestExp = "exp(" + expPoly.toFactorString() + ")"`，然后计算 `expPoly` 的 `gcd`。如果 `gcd > 1`，则生成提取后的字符串 `reducedStr = "exp(" + reducedPoly.toFactorString() + ")^" + gcd`。最后，严格比较两者的字符串长度 `if (reducedStr.length() < bestExp.length())`，只在真实验证长度变短时才采用新形式。

<strong>正项提前：</strong>

在多项式输出时，如果第一项带有负号，会白白多占一个字符。根据加法交换律，将任意一个系数为正的项移到首位输出，就可以省略首位的 `+` 号，同时避免首位是 `-` 号的情况。

<strong>实现方式：</strong> 在底层多项式的 `toString` 遍历逻辑中，优先寻找并打印第一个正系数项，然后再按序输出其余项。

#### 2. 优化能否保证代码的简洁性与正确性

<strong>完全能保证。</strong>

<strong>关于正确性：</strong> 这两种优化策略在数学上都是绝对等价的变形。正项提前利用了加法交换律，提取 GCD 利用了指数幂的运算法则。同时，我在提取 GCD 时加入了<strong>长度贪心判断</strong>，确保只有在字符数实质减少时才替换，避免了弄巧成拙，如提取 2 之后反而多出了 `^2` 导致总长度增加的边界情况。

<strong>关于代码简洁性：</strong> 这正是这种策略被称为“高性价比”的原因。相较于在 AST阶段进行极其复杂的节点重构，我的优化完全后置于对象向字符串转换的 `toString()` 阶段。底层的数据存储结构，如多项式的项集、指数因子完全保持原样，无需引入额外的维护状态。这使得核心架构保持了极高的内聚性和清爽度，极大地降低了引入新 Bug 的风险。

## 六、 大模型（AI）使用情况

### 1. 自身 AI 使用情况

在三次作业中，我大概有 40% 的代码是借助 AI 辅助生成的。不过最核心的递归下降解析逻辑和底层求导的数学推导，我都是自己纯手打的，毕竟这些硬骨头得自己啃才能真正掌握架构。

在<strong>正确性</strong>方面，AI 主要充当了我的主要是写之前ai给出架构步骤，和写完后debug。每次迭代动手敲代码前，我都会先让大模型帮我理清整体的架构步骤，看看怎么把表达式、项、因子合理分层。等代码写完，如果遇到一些死活查不出来的逻辑 bug 或者空指针，我就会把出问题的代码段和测试数据扔给它帮忙定位，效果往往还不错。

在<strong>性能优化</strong>方面，我主要是把跑得慢的方法发给 AI，让它给我提优化建议。虽然最后权衡了实现难度，我只挑了提取 $gcd$ 和正项提前这种高性价比的策略，但它确实给了我不少关于如何减少多项式对象创建、如何做方法级缓存的思路启发。

### 2. 互测房间内的 AI 观察

在互测环节中，我发现房间内的玉衡星可能在作业中大量使用了 AI 或是自动代码生成工具。

在阅读该同学的代码时，我在main中看到了这样一行注释：

```
//TIP 要<b>运行</b>代码，请按 <shortcut actionId="Run"/> 或
// 点击装订区域中的 <icon src="AllIcons.Actions.Execute"/> 图标。
```

我怀疑是直接复制的或者vibe coding的，忘记删了，最后甚至没有完整看一遍。

---

## 七、 心得体会

第一单元这三次作业熬下来，我最大的感触就是千万不要太钻牛角尖去卷性能分。很多时候为了哪怕一丁点多项式的化简，很容易就把最基础的正确性给搞崩了。我回过头去盘点了一下，我在这几次作业里踩坑甚至直接 TLE 的地方，追根溯源全是因为我强行去做性能优化惹的祸。稳扎稳打拿满正确性才是王道，本末倒置真的得不偿失。

还有个惨痛的教训就是做架构的时候切忌过度设计。刚开始写的时候总想着未雨绸缪，给未来可能出现的需求留足接口，搞了一大堆花里胡哨的冗余设计。结果到了下一次迭代一看，不仅新需求完全不按套路出牌，之前写的那些冗余代码反而成了极其庞大的累赘，不仅读起来费劲，最后还得自己一行一行删掉重构，纯粹是给自己增加工作量。简单直接、够用就好，这才是最实用的代码哲学。

最后不得不感叹现在的 AI 确实极其发达，写代码一定要学会充分利用大模型来给自己当外脑。说实话我这次就吃了个大亏，第三次作业里那个导致我超时的 base = base.mul(base); 的致命 bug，其实 AI 帮我做代码静态检查的时候早就明明白白地指出来了，但我当时没当回事根本没听。如果在查错的时候能多给 AI 一点信任，认真看看它给的反馈，我绝对能少走很多弯路。接下来的学习中我一定会更加虚心且高效地利用好这个强大的帮手。

---

## 八、 未来方向建议

整体来说我觉得第一单元现在的课程安排和节奏就已经挺好的了，难度递进比较合理，也没有什么大毛病。不过如果在细节上能稍微优化一下，体验一定会更好。

关于互测环节的冷却时间，我强烈建议可以适当缩短一点。半个小时的冷却期感觉还是太多了，有时候看别人的代码刚有了个绝妙的 hack 思路，或者刚捏造出一个极具杀伤力的边界数据想要赶紧去验证一下，结果系统提示还在冷却中，只能硬生生干等，挺打断思路和测试节奏的。如果能缩短这个时间，大家互测的积极性和流畅度应该都会提高不少。

另外就是第一单元的第一次作业，对刚接触这种量级项目的同学来说确实有点难以下手，很容易看着空白屏幕发呆。虽然之前安排了上机代码填空的练习，但那上面的代码结构和我们真正做作业要从零开始写的架构并不完全吻合，参考起来还是有门槛。我建议或许可以在第一次作业的指导书里，直接给大家提供一个大致的伪代码框架，或者稍微提示一下几个核心类该怎么交互。这样应该能很大程度上缓解大家开荒期的焦虑感，也能在一开始就帮大家把面向对象的思维给引导到正确的路子上。

---

## 九、 思考题（选做）

<strong>1. 如何检查输入是否符合要求？</strong>

结合预处理与解析器双重校验。首先在 `Lexer` 预处理阶段，用正则检查是否出现了非法字符或非法连续符号（如 `***`），以及空格是否出现在了非法位置（如带符号整数内部：`[+-]\s+\d`）。其次，在 `Parser` 递归下降解析时，如果遇到了不符合任何文法分支的 Token 序列，直接抛出自定义异常（如 `WrongFormatException`）。

<strong>2. 如何精确计算一个合法输入的 cost？</strong>

可以完美复用现有的 AST 结构。在 `Factor` 接口中新增一个 `getCost()` 方法声明，让所有具体节点实现它。在 `Parser` 解析生成 AST 树后，不调用 `toPoly()`，而是自顶向下递归调用 `getCost()`。例如 `Expr.getCost()` 就是对其下所有 `Term.getCost()` 求和；对于 `ExpFactor.getCost()` 则返回 `arg.getCost() + 1`，严格按照指导书的代价函数规则进行递归累加计算即可。
