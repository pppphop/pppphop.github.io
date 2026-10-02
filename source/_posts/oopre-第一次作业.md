---
title: "oopre-第一次作业"
date: "2025-09-07 07:04:43"
updated: "2026-02-07 17:06:31"
categories:
  - "oopre"
tags:
  - "oopre"
permalink: "posts/oopre-第一次作业/"
---
# 第一次作业

#### 作业要求

课程组在本次作业对应的 git 仓库中提供了一份 <strong>有错误</strong> 的代码，你需要对代码进行修改，使程序能够正确的完成上面的场景逻辑。完成代码的修改后，你需要将代码提交到 hw1 的评测窗口，并且通过所有测试点

#### 背景描述

欢迎来到虚拟宠物乐园！你是一位宠物爱好者，初始经验值为 0，你拥有一只可爱的虚拟宠物，宠物拥有 <strong>名字、饥饿度、快乐度和健康度</strong> 四种属性信息。你的任务是照顾好它，确保它不会太饿、太不开心或者太不健康。你可以给它喂食不同的食物来降低它的饥饿度，也可以陪它玩耍来提高它的快乐度。但是要小心，过度喂食可能会降低宠物的健康度！

具体的，我们做出如下约定：

1. 有两种食物 biscuit 和 fruit 可供喂食，每次喂食后，

 玩家经验值增加 5 点
  - biscuit：喂食 biscuit 后，宠物的 <strong>饥饿度降低 10 点</strong>
  - fruit：喂食 fruit 后，宠物的 <strong>饥饿度降低 8 点</strong>
  - 特殊的，当宠物被喂食超过 <strong>3</strong> 次 biscuit 后，每次喂食 biscuit（从第 4 次开始）后，饥饿度降低 10 点的同时，<strong>健康度降低 5 点</strong>
2. 陪宠物进行一次玩耍，<strong>宠物的快乐度升高 5 点</strong>，<strong>玩家经验值增加 7 点</strong>
3. 宠物的饥饿度和健康度不得低于 0，快乐度不得高于 100。如果某次操作使得宠物的饥饿度或健康度小于 0，则宠物的饥饿度或健康度视为 0；如果某次操作使得宠物的快乐度超过 100，则宠物的快乐度视为 100。

#### 输入要求

游戏开始时，你会收到一个虚拟宠物的名字和它的初始饥饿度、快乐度和健康度。

第 11 行一个字符串，表示虚拟宠物的名字；第 2,3,42,3,4 行一行一个非负整数，依次表示虚拟宠物的初始饥饿度、快乐度和健康度。

从第 55 行开始，你将从标准输入读取一系列指令，直到遇到结束指令为止。每个指令可以是以下几种之一：

- `feed <food_name>`: 给宠物喂食某种食物（food&#95;name 只可能为 `biscuit` 和 `fruit` 其中之一）。
- `play`: 和宠物一起玩耍。
- `status`: 查看宠物的当前状态。
- `quit`: 结束游戏。

数据保证指令数不超过 200200 条。

#### 输出要求

对于每个 `status` 指令，你需要输出宠物的当前状态，格式为：

```
<pet_name>:
Hunger: <hunger>
Happiness: <happiness>
Health: <health>
```

其中`<pet_name>`是宠物的名字，`<hunger>`、`<happiness>`和`<health>`分别是宠物的饥饿度、快乐度和健康度。

当游戏结束（即遇到`quit`指令），你需要输出最终状态和一条告别消息：

```
<pet_name>:
Hunger: <hunger>
Happiness: <happiness>
Health: <health>

Final Player Exp: <exp>

Thank you for playing!
```

<strong>注意，输出的内容在我们所给的代码中是正确完成的，同学们不修改 `System.out` 相关的内容即可。</strong>

#### 样例

##### 输入样例 1

```text
dog
10
10
10
feed fruit
play
status
feed biscuit
quit
```

##### 输出样例 1

```text
dog:
Hunger: 2
Happiness: 15
Health: 10

dog:
Hunger: 0
Happiness: 15
Health: 10

Final Player Exp: 17

Thank you for playing!
```

##### 输入样例 2

```text
dog
100
100
100
feed biscuit
feed biscuit
feed biscuit
feed biscuit
feed biscuit
quit
```

##### 输出样例 2

```text
dog:
Hunger: 50
Happiness: 100
Health: 90

Final Player Exp: 25

Thank you for playing!
```
