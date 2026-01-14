// 游戏配置
const GAME_CONFIG = {
    BOARD_SIZE: 6,
    GEM_TYPES: ['fire', 'water', 'wood', 'light', 'dark'],
    GEM_EMOJIS: {
        fire: '🔥',
        water: '💧',
        wood: '🌿',
        light: '✨',
        dark: '🌑',
        bomb: '💣',
        flame: '🔥' // 烈火符石
    },
    GEM_NAMES: {
        fire: '火',
        water: '水',
        wood: '木',
        light: '光',
        dark: '暗',
        bomb: '炸弹',
        flame: '烈火'
    },
    ENEMY_MAX_HP: 500,
    PLAYER_MAX_HP: 34277,
    BOMB_SPAWN_RATE: 0.1 // 炸弹出现概率 10%
};

// 游戏配置数据
let gameConfigData = null;
let currentLevel = null;
let playerMaxHp = 10000; // 玩家最大生命值（全局配置）

// 游戏状态
const gameState = {
    board: [],
    selectedHero: null,
    selectedGem: null,
    enemyHp: 0,
    playerHp: 0,
    heroes: [],
    isPlayerTurn: true,
    isSelectingArea: false,
    previewedArea: [], // 当前预览的区域
    currentEnemy: null // 当前敌人配置
};

// 英雄配置
const heroesConfig = [
    { 
        id: 0, 
        name: '火之战士', 
        attribute: 'fire', 
        emoji: '⚔️', 
        skillRange: { width: 1, height: 4 },
        skillDescription: '消除范围内符石，使用后随机将5个非火焰符石变为火焰符石'
    },
    { 
        id: 1, 
        name: '火魔法使', 
        attribute: 'fire', 
        emoji: '🧙', 
        skillRange: { width: 3, height: 1 },
        skillDescription: '消除范围内符石，范围内每个火焰符石周围1格内的符石会变为火焰符石'
    },
    { 
        id: 2, 
        name: '火神龙', 
        attribute: 'fire', 
        emoji: '🐉', 
        skillRange: { width: 1, height: 1 },
        skillDescription: '消除范围内符石，额外消除面板上所有火焰符石，造成消除数量*50的额外伤害'
    },
    { 
        id: 3, 
        name: '光之圣骑士', 
        attribute: 'light', 
        emoji: '🛡️', 
        skillRange: { width: 3, height: 3 },
        skillDescription: '消除范围内符石，对敌人造成伤害'
    },
    { 
        id: 4, 
        name: '暗之刺客', 
        attribute: 'dark', 
        emoji: '🗡️', 
        skillRange: { width: 4, height: 1 },
        skillDescription: '消除范围内符石，对敌人造成伤害'
    },
    { 
        id: 5, 
        name: '火之法师', 
        attribute: 'fire', 
        emoji: '🔥', 
        skillRange: { width: 2, height: 1 },
        skillDescription: '消除范围内符石，使用后生成1个烈火符石'
    }
];

// 加载配置文件
async function loadConfig() {
    try {
        const response = await fetch('config.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        gameConfigData = await response.json();
        console.log('配置加载成功:', gameConfigData);
        
        // 验证配置数据
        if (!gameConfigData.levels || !Array.isArray(gameConfigData.levels) || gameConfigData.levels.length === 0) {
            console.warn('配置数据无效，使用默认配置');
            return getDefaultConfig();
        }
        
        // 读取全局玩家初始生命值配置
        if (gameConfigData.player && gameConfigData.player.initialHp) {
            playerMaxHp = gameConfigData.player.initialHp;
            console.log('玩家初始生命值:', playerMaxHp);
        }
        
        return gameConfigData;
    } catch (error) {
        console.error('加载配置文件失败:', error);
        // 使用默认配置
        return getDefaultConfig();
    }
}

// 获取默认配置
function getDefaultConfig() {
    return {
        player: {
            initialHp: 10000
        },
        levels: [{
            id: 1,
            name: "默认关卡",
            enemy: {
                id: "default_enemy",
                name: "暗影巫妖",
                emoji: "👹",
                maxHp: 500,
                minDamage: 500,
                maxDamage: 1000,
                attackCooldown: 1
            }
        }]
    };
}

// 初始化关卡选择界面
function initLevelSelect() {
    const levelsList = document.getElementById('levelsList');
    if (!levelsList) {
        console.error('levelsList元素不存在');
        return;
    }
    
    levelsList.innerHTML = '';
    
    if (!gameConfigData || !gameConfigData.levels) {
        console.error('配置数据无效');
        return;
    }
    
    gameConfigData.levels.forEach(level => {
        const levelCard = document.createElement('div');
        levelCard.className = 'level-card';
        levelCard.innerHTML = `
            <div class="level-emoji">${level.enemy.emoji}</div>
            <div class="level-name">${level.name}</div>
            <div class="level-description">${level.description || ''}</div>
            <div class="level-stats">
                <span>敌人HP: ${level.enemy.maxHp.toLocaleString()}</span>
                <span>玩家HP: ${playerMaxHp.toLocaleString()}</span>
            </div>
        `;
        levelCard.addEventListener('click', () => {
            console.log('点击关卡:', level.name);
            startLevel(level);
        });
        levelsList.appendChild(levelCard);
    });
}

// 初始化关卡选择界面的按钮事件（只初始化一次）
function initLevelSelectButtons() {
    // 重新加载配置按钮
    const reloadBtn = document.getElementById('reloadConfigBtn');
    if (reloadBtn) {
        // 移除旧的事件监听器（通过克隆节点）
        const newReloadBtn = reloadBtn.cloneNode(true);
        reloadBtn.parentNode.replaceChild(newReloadBtn, reloadBtn);
        newReloadBtn.addEventListener('click', async () => {
            await loadConfig();
            initLevelSelect();
            alert('配置已重新加载！');
        });
    }
    
    // 返回游戏按钮
    const backToGameBtn = document.getElementById('backToGameBtn');
    if (backToGameBtn) {
        // 移除旧的事件监听器（通过克隆节点）
        const newBackBtn = backToGameBtn.cloneNode(true);
        backToGameBtn.parentNode.replaceChild(newBackBtn, backToGameBtn);
        newBackBtn.addEventListener('click', () => {
            console.log('返回游戏');
            backToGame();
        });
    }
}

// 开始关卡
function startLevel(level) {
    console.log('开始关卡:', level);
    
    if (!level || !level.enemy) {
        console.error('关卡数据无效:', level);
        return;
    }
    
    // 验证关卡数据完整性
    if (!level.enemy.maxHp) {
        console.error('关卡敌人配置无效:', level);
        return;
    }
    
    currentLevel = level;
    gameState.currentEnemy = level.enemy;
    gameState.enemyHp = level.enemy.maxHp;
    
    // 只在第一次进入游戏时设置玩家生命值，后续关卡继承当前生命值
    if (gameState.playerHp === 0) {
        gameState.playerHp = playerMaxHp;
    }
    // 如果玩家生命值超过最大值，恢复到最大值
    if (gameState.playerHp > playerMaxHp) {
        gameState.playerHp = playerMaxHp;
    }
    
    // 隐藏关卡选择界面，显示游戏界面
    const levelSelectScreen = document.getElementById('levelSelectScreen');
    const gameContainer = document.getElementById('gameContainer');
    
    if (levelSelectScreen) {
        levelSelectScreen.style.display = 'none';
    }
    if (gameContainer) {
        gameContainer.style.display = 'flex';
    }
    
    // 更新敌人显示
    updateEnemyDisplay();
    
    // 初始化游戏
    initGame();
}

// 更新敌人显示
function updateEnemyDisplay() {
    if (!gameState.currentEnemy) return;
    
    const enemyNameEl = document.querySelector('.enemy-name');
    const enemySpriteEl = document.querySelector('.boss-character');
    
    if (enemyNameEl) {
        enemyNameEl.textContent = gameState.currentEnemy.name;
    }
    if (enemySpriteEl) {
        enemySpriteEl.textContent = gameState.currentEnemy.emoji;
    }
}

// 初始化游戏
function initGame() {
    createBoard();
    createHeroes();
    updateUI();
    setupEventListeners();
    hideSkillRangePreview(); // 初始隐藏预览面板
}

// 创建符石棋盘
function createBoard() {
    const board = [];
    const gemBoard = document.getElementById('gemBoard');
    gemBoard.innerHTML = '';

    for (let row = 0; row < GAME_CONFIG.BOARD_SIZE; row++) {
        board[row] = [];
        for (let col = 0; col < GAME_CONFIG.BOARD_SIZE; col++) {
            const gemType = getRandomGemType();
            board[row][col] = gemType;
            
            const gem = createGemElement(row, col, gemType);
            gemBoard.appendChild(gem);
        }
    }

    gameState.board = board;
}

// 创建符石元素
function createGemElement(row, col, type) {
    const gem = document.createElement('div');
    gem.className = `gem ${type}`;
    gem.dataset.row = row;
    gem.dataset.col = col;
    gem.textContent = GAME_CONFIG.GEM_EMOJIS[type];
    
    gem.addEventListener('click', () => handleGemClick(row, col));
    gem.addEventListener('mouseenter', () => handleGemHover(row, col));
    gem.addEventListener('mouseleave', () => clearSkillPreview());
    
    return gem;
}

// 获取随机符石类型
function getRandomGemType() {
    // 先判断是否生成炸弹（较低概率）
    if (Math.random() < GAME_CONFIG.BOMB_SPAWN_RATE) {
        return 'bomb';
    }
    
    // 否则生成普通符石
    const types = GAME_CONFIG.GEM_TYPES;
    return types[Math.floor(Math.random() * types.length)];
}

// 创建英雄
function createHeroes() {
    const heroesRow = document.getElementById('heroesRow');
    heroesRow.innerHTML = '';

    gameState.heroes = heroesConfig.map(hero => ({
        ...hero,
        available: true
    }));

    gameState.heroes.forEach(hero => {
        const heroPortrait = document.createElement('div');
        heroPortrait.className = 'hero-portrait';
        heroPortrait.dataset.heroId = hero.id;
        heroPortrait.textContent = hero.emoji;
        
        const attributeBadge = document.createElement('div');
        attributeBadge.className = 'hero-attribute';
        attributeBadge.textContent = GAME_CONFIG.GEM_NAMES[hero.attribute];
        heroPortrait.appendChild(attributeBadge);

        heroPortrait.addEventListener('click', () => handleHeroClick(hero.id));
        
        heroesRow.appendChild(heroPortrait);
    });
}

// 处理英雄点击
function handleHeroClick(heroId) {
    if (!gameState.isPlayerTurn) return;

    const hero = gameState.heroes[heroId];
    if (!hero.available) return;

    // 取消之前的选择
    if (gameState.selectedHero !== null) {
        const prevHero = document.querySelector(`[data-hero-id="${gameState.selectedHero}"]`);
        if (prevHero) prevHero.classList.remove('selected');
    }

    // 选择新英雄
    gameState.selectedHero = heroId;
    const heroElement = document.querySelector(`[data-hero-id="${heroId}"]`);
    heroElement.classList.add('selected');

    gameState.isSelectingArea = true;
    updateTurnIndicator(`选择 ${hero.name} 的技能释放区域（点击符石棋盘）`);
    
    // 显示技能范围预览
    showSkillRangePreview(hero);
}

// 处理符石悬停
function handleGemHover(row, col) {
    if (!gameState.isPlayerTurn || !gameState.isSelectingArea || gameState.selectedHero === null) {
        return;
    }
    
    // 显示技能范围预览
    showSkillPreview(row, col);
}

// 显示技能范围预览
function showSkillPreview(centerRow, centerCol) {
    // 清除之前的预览
    clearSkillPreview();
    
    const skillArea = getSkillArea(centerRow, centerCol, gameState.selectedHero);
    const hero = gameState.heroes[gameState.selectedHero];
    
    skillArea.forEach(([r, c]) => {
        if (isValidPosition(r, c)) {
            const gem = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (gem) {
                gem.classList.add('preview');
                
                // 如果是匹配的属性，添加特殊高亮
                if (gameState.board[r][c] === hero.attribute) {
                    gem.classList.add('preview-match');
                }
                
                gameState.previewedArea.push([r, c]);
            }
        }
    });
}

// 清除技能预览
function clearSkillPreview() {
    gameState.previewedArea.forEach(([r, c]) => {
        const gem = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (gem) {
            gem.classList.remove('preview', 'preview-match');
        }
    });
    gameState.previewedArea = [];
}

// 处理符石点击
function handleGemClick(row, col) {
    if (!gameState.isPlayerTurn || !gameState.isSelectingArea) return;

    // 清除预览
    clearSkillPreview();

    // 使用选中的英雄释放技能
    if (gameState.selectedHero !== null) {
        useHeroSkill(row, col);
    }
}

// 使用英雄技能
function useHeroSkill(centerRow, centerCol) {
    const hero = gameState.heroes[gameState.selectedHero];
    const skillArea = getSkillArea(centerRow, centerCol, gameState.selectedHero);
    
    // 火魔法使特殊效果：在消除前，将技能范围内火焰符石周围1格内的符石转换为火焰符石
    if (hero.id === 1) {
        convertFireAdjacentGems(skillArea);
        return; // 转换函数内部会处理后续逻辑
    }
    
    // 其他英雄的正常技能逻辑
    executeSkillAfterConversion(hero, skillArea);
}

// 计算所有会被消除的位置（包括炸弹触发的相邻位置和烈火符石的整行整列）
function calculateAllRemovedPositions(initialPositions) {
    const positionsToRemove = new Set();
    const bombPositions = [];
    const flamePositions = [];
    
    // 第一遍：收集初始要消除的位置，并识别炸弹和烈火符石
    initialPositions.forEach(([row, col]) => {
        positionsToRemove.add(`${row},${col}`);
        
        const gemType = gameState.board[row][col];
        // 检查是否是炸弹
        if (gemType === 'bomb') {
            bombPositions.push([row, col]);
        }
        // 检查是否是烈火符石
        if (gemType === 'flame') {
            flamePositions.push([row, col]);
        }
    });
    
    // 第二遍：处理炸弹的连锁爆炸
    bombPositions.forEach(([row, col]) => {
        const adjacent = getAdjacentPositions(row, col);
        adjacent.forEach(([r, c]) => {
            positionsToRemove.add(`${r},${c}`);
            
            // 检查炸弹触发的相邻位置是否也是烈火符石
            if (gameState.board[r][c] === 'flame') {
                flamePositions.push([r, c]);
            }
        });
    });
    
    // 第三遍：处理烈火符石的整行整列消除
    flamePositions.forEach(([row, col]) => {
        const rowColPositions = getRowAndColumnPositions(row, col);
        rowColPositions.forEach(([r, c]) => {
            positionsToRemove.add(`${r},${c}`);
        });
    });
    
    // 转换为数组格式
    return Array.from(positionsToRemove).map(posStr => {
        const [row, col] = posStr.split(',').map(Number);
        return [row, col];
    });
}

// 获取技能区域（根据英雄的技能范围）
function getSkillArea(centerRow, centerCol, heroId) {
    const hero = gameState.heroes[heroId];
    const range = hero.skillRange;
    const area = [];
    
    // 计算范围的起始位置（以中心点为基准）
    const startRow = centerRow - Math.floor(range.height / 2);
    const startCol = centerCol - Math.floor(range.width / 2);
    
    // 生成范围内的所有位置
    for (let r = 0; r < range.height; r++) {
        for (let c = 0; c < range.width; c++) {
            area.push([startRow + r, startCol + c]);
        }
    }
    
    return area;
}

// 检查位置是否有效
function isValidPosition(row, col) {
    return row >= 0 && row < GAME_CONFIG.BOARD_SIZE &&
           col >= 0 && col < GAME_CONFIG.BOARD_SIZE;
}

// 计算伤害
function calculateDamage(matchingCount) {
    // 基础伤害 = 匹配数量 * 100
    // 每多一个匹配符石，伤害增加
    return matchingCount * 100 + (matchingCount > 0 ? matchingCount * 50 : 0);
}

// 显示伤害
function showDamage(damage) {
    const damageDisplay = document.getElementById('damageDisplay');
    damageDisplay.textContent = `-${damage}`;
    damageDisplay.classList.add('show');
    
    setTimeout(() => {
        damageDisplay.classList.remove('show');
    }, 1000);
}

// 获取相邻位置（上下左右）
function getAdjacentPositions(row, col) {
    return [
        [row - 1, col], // 上
        [row + 1, col], // 下
        [row, col - 1], // 左
        [row, col + 1]  // 右
    ].filter(([r, c]) => isValidPosition(r, c));
}

// 获取整行和整列的位置（包括自身）
function getRowAndColumnPositions(row, col) {
    const positions = [];
    
    // 添加整行的位置（包括自身）
    for (let c = 0; c < GAME_CONFIG.BOARD_SIZE; c++) {
        positions.push([row, c]);
    }
    
    // 添加整列的位置（排除自身，因为已经在行中包含了）
    for (let r = 0; r < GAME_CONFIG.BOARD_SIZE; r++) {
        if (r !== row) {
            positions.push([r, col]);
        }
    }
    
    return positions;
}

// 生成烈火符石
function spawnFlameGem() {
    // 找到所有空位置
    const emptyPositions = [];
    for (let row = 0; row < GAME_CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < GAME_CONFIG.BOARD_SIZE; col++) {
            if (gameState.board[row][col] === null) {
                emptyPositions.push([row, col]);
            }
        }
    }
    
    let targetRow, targetCol;
    
    // 如果有空位置，优先选择空位置
    if (emptyPositions.length > 0) {
        const randomIndex = Math.floor(Math.random() * emptyPositions.length);
        [targetRow, targetCol] = emptyPositions[randomIndex];
    } else {
        // 如果没有空位置，随机选择一个位置（替换普通符石）
        targetRow = Math.floor(Math.random() * GAME_CONFIG.BOARD_SIZE);
        targetCol = Math.floor(Math.random() * GAME_CONFIG.BOARD_SIZE);
    }
    
    gameState.board[targetRow][targetCol] = 'flame';
    updateUI();
}

// 将技能范围内火焰符石周围1格内的符石转换为火焰符石（火魔法使技能）
function convertFireAdjacentGems(skillArea) {
    const hero = gameState.heroes[gameState.selectedHero];
    const positionsToConvert = new Set();
    
    // 遍历技能范围内的所有位置
    skillArea.forEach(([r, c]) => {
        if (isValidPosition(r, c) && gameState.board[r][c] === 'fire') {
            // 找到火焰符石，获取其上下左右1格内的位置
            const adjacent = getAdjacentPositions(r, c);
            adjacent.forEach(([adjRow, adjCol]) => {
                // 只转换非火焰符石、非炸弹、非烈火符石的位置
                const gemType = gameState.board[adjRow][adjCol];
                if (gemType && gemType !== 'fire' && gemType !== 'bomb' && gemType !== 'flame') {
                    positionsToConvert.add(`${adjRow},${adjCol}`);
                }
            });
        }
    });
    
    // 转换所有符合条件的符石
    if (positionsToConvert.size > 0) {
        positionsToConvert.forEach((posStr, index) => {
            setTimeout(() => {
                const [row, col] = posStr.split(',').map(Number);
                const gem = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (gem) {
                    // 添加转换动画
                    gem.classList.add('converting-to-fire');
                    // 更新棋盘数据
                    gameState.board[row][col] = 'fire';
                }
            }, index * 50); // 错开动画时间
        });
        
        // 等待转换动画完成后继续执行技能逻辑
        setTimeout(() => {
            updateUI();
            // 继续执行技能消除逻辑
            executeSkillAfterConversion(hero, skillArea);
        }, positionsToConvert.size * 50 + 300);
    } else {
        // 如果没有需要转换的符石，直接执行技能逻辑
        executeSkillAfterConversion(hero, skillArea);
    }
}

// 执行技能消除逻辑（火魔法使转换后的后续处理）
function executeSkillAfterConversion(hero, skillArea) {
    // 收集要消除的符石
    const gemsToRemove = [];
    skillArea.forEach(([r, c]) => {
        if (isValidPosition(r, c)) {
            gemsToRemove.push([r, c, gameState.board[r][c]]);
        }
    });

    // 计算所有会被消除的位置（包括炸弹触发的相邻位置）
    const allRemovedPositions = calculateAllRemovedPositions(gemsToRemove.map(([r, c]) => [r, c]));
    
    // 火神龙特殊效果：额外消除所有火焰符石
    let extraFireGemsRemoved = 0;
    const allFireGemsPositions = [];
    if (hero.id === 2) {
        // 收集所有火焰符石的位置（不包括技能范围内的，因为会被正常消除）
        for (let row = 0; row < GAME_CONFIG.BOARD_SIZE; row++) {
            for (let col = 0; col < GAME_CONFIG.BOARD_SIZE; col++) {
                // 检查是否在技能范围内
                const inSkillArea = skillArea.some(([r, c]) => r === row && c === col);
                if (!inSkillArea && gameState.board[row][col] === 'fire') {
                    allFireGemsPositions.push([row, col]);
                    extraFireGemsRemoved++;
                }
            }
        }
    }

    // 计算所有会被消除的位置（包括炸弹触发的相邻位置）
    let finalRemovedPositions = allRemovedPositions;
    if (hero.id === 2 && allFireGemsPositions.length > 0) {
        // 将额外消除的火焰符石位置也加入消除列表
        const extraPositions = calculateAllRemovedPositions(allFireGemsPositions);
        // 合并位置，使用Set去重
        const allPositionsSet = new Set();
        allRemovedPositions.forEach(([r, c]) => allPositionsSet.add(`${r},${c}`));
        extraPositions.forEach(([r, c]) => allPositionsSet.add(`${r},${c}`));
        finalRemovedPositions = Array.from(allPositionsSet).map(posStr => {
            const [r, c] = posStr.split(',').map(Number);
            return [r, c];
        });
    }
    
    // 计算伤害（只计算有属性的符石，排除炸弹和烈火）
    const allRemovedGems = finalRemovedPositions.map(([r, c]) => {
        const type = gameState.board[r][c];
        return [r, c, type];
    });
    const matchingGems = allRemovedGems.filter(([r, c, type]) => 
        type !== 'bomb' && type !== 'flame' && type === hero.attribute
    );
    let damage = calculateDamage(matchingGems.length);
    
    // 火神龙额外伤害：额外消除的火焰符石数量 * 50
    if (hero.id === 2 && extraFireGemsRemoved > 0) {
        const extraDamage = extraFireGemsRemoved * 50;
        damage += extraDamage;
    }

    // 显示伤害
    showDamage(damage);

    // 消除符石（包括额外消除的火焰符石）
    const allGemsToRemove = [...gemsToRemove.map(([r, c]) => [r, c])];
    if (hero.id === 2 && allFireGemsPositions.length > 0) {
        allGemsToRemove.push(...allFireGemsPositions);
    }
    removeGems(allGemsToRemove);

    // 火之法师特殊效果：生成烈火符石
    if (hero.id === 5) {
        setTimeout(() => {
            spawnFlameGem();
        }, 400);
    }

    // 延迟执行下落和填充
    setTimeout(() => {
        applyGravity();
        fillEmptySpaces();
        updateUI();
        
        // 火之战士特殊效果：将随机5个非火焰符石变成火焰符石
        if (hero.id === 0) {
            setTimeout(() => {
                convertGemsToFire(5);
            }, 200);
        }
        
        // 对敌人造成伤害
        if (damage > 0) {
            gameState.enemyHp = Math.max(0, gameState.enemyHp - damage);
            updateUI();
            
            // 检查胜利条件
            if (gameState.enemyHp <= 0) {
                setTimeout(() => {
                    const enemyName = gameState.currentEnemy ? gameState.currentEnemy.name : '敌人';
                    const rewards = currentLevel && currentLevel.rewards ? 
                        `\n获得奖励：金币 ${currentLevel.rewards.gold}，经验 ${currentLevel.rewards.exp}` : '';
                    alert(`胜利！你击败了${enemyName}！${rewards}`);
                    // 进入下一关
                    goToNextLevel();
                }, 500);
                return;
            }
        }

        // 重置选择状态
        resetSelection();
        
        // 切换到敌人回合（这里可以添加敌人AI）
        setTimeout(() => {
            enemyTurn();
        }, 1000);
    }, 500);
}

// 将随机N个非火焰符石转换为火焰符石
function convertGemsToFire(count) {
    // 收集所有非火焰符石的位置
    const nonFirePositions = [];
    for (let row = 0; row < GAME_CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < GAME_CONFIG.BOARD_SIZE; col++) {
            const gemType = gameState.board[row][col];
            // 排除火焰符石、炸弹、烈火符石和空位置
            if (gemType && gemType !== 'fire' && gemType !== 'bomb' && gemType !== 'flame') {
                nonFirePositions.push([row, col]);
            }
        }
    }
    
    // 如果可转换的位置少于需要的数量，使用所有可转换的位置
    const convertCount = Math.min(count, nonFirePositions.length);
    
    if (convertCount === 0) {
        return; // 没有可转换的符石
    }
    
    // 随机选择要转换的位置
    const positionsToConvert = [];
    const availablePositions = [...nonFirePositions];
    
    for (let i = 0; i < convertCount; i++) {
        const randomIndex = Math.floor(Math.random() * availablePositions.length);
        positionsToConvert.push(availablePositions[randomIndex]);
        availablePositions.splice(randomIndex, 1);
    }
    
    // 转换符石并添加转换动画
    let completedCount = 0;
    positionsToConvert.forEach(([row, col], index) => {
        setTimeout(() => {
            const gem = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            if (gem) {
                // 添加转换动画
                gem.classList.add('converting-to-fire');
                
                // 更新棋盘数据
                gameState.board[row][col] = 'fire';
                
                // 延迟更新UI，让动画完成
                setTimeout(() => {
                    completedCount++;
                    // 所有转换完成后统一更新UI
                    if (completedCount === positionsToConvert.length) {
                        updateUI();
                    }
                }, 300);
            }
        }, index * 50); // 错开动画时间，让转换更有层次感
    });
}

// 消除符石
function removeGems(positions) {
    const positionsToRemove = new Set();
    const bombPositions = [];
    const flamePositions = [];
    
    // 第一遍：收集要消除的位置，并识别炸弹和烈火符石
    positions.forEach(([row, col]) => {
        positionsToRemove.add(`${row},${col}`);
        
        const gemType = gameState.board[row][col];
        // 检查是否是炸弹
        if (gemType === 'bomb') {
            bombPositions.push([row, col]);
        }
        // 检查是否是烈火符石
        if (gemType === 'flame') {
            flamePositions.push([row, col]);
        }
    });
    
    // 第二遍：处理炸弹的连锁爆炸
    bombPositions.forEach(([row, col]) => {
        const adjacent = getAdjacentPositions(row, col);
        adjacent.forEach(([r, c]) => {
            positionsToRemove.add(`${r},${c}`);
            
            // 检查炸弹触发的相邻位置是否也是烈火符石
            if (gameState.board[r][c] === 'flame') {
                flamePositions.push([r, c]);
            }
        });
    });
    
    // 第三遍：处理烈火符石的整行整列消除
    flamePositions.forEach(([row, col]) => {
        const rowColPositions = getRowAndColumnPositions(row, col);
        rowColPositions.forEach(([r, c]) => {
            positionsToRemove.add(`${r},${c}`);
        });
    });
    
    // 第四遍：执行消除动画
    positionsToRemove.forEach(posStr => {
        const [row, col] = posStr.split(',').map(Number);
        const gem = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (gem) {
            gem.classList.add('removing');
            const gemType = gameState.board[row][col];
            
            // 如果是炸弹，添加爆炸特效
            if (gemType === 'bomb') {
                gem.classList.add('bomb-explode');
            }
            
            // 如果是烈火符石，添加烈火特效
            if (gemType === 'flame') {
                gem.classList.add('flame-explode');
                // 创建行和列的特效
                createFlameEffect(row, col);
            }
            
            setTimeout(() => {
                gameState.board[row][col] = null;
            }, 300);
        }
    });
}

// 创建烈火消除整行整列的特效
function createFlameEffect(row, col) {
    const gemBoard = document.getElementById('gemBoard');
    const cellSize = gemBoard.offsetWidth / GAME_CONFIG.BOARD_SIZE;
    const gap = 4; // 与CSS中的gap一致
    
    // 创建行特效
    const rowEffect = document.createElement('div');
    rowEffect.className = 'flame-effect flame-row';
    rowEffect.style.top = `${row * (cellSize + gap)}px`;
    rowEffect.style.left = '0px';
    rowEffect.style.width = `${gemBoard.offsetWidth}px`;
    rowEffect.style.height = `${cellSize}px`;
    gemBoard.appendChild(rowEffect);
    
    // 创建列特效
    const colEffect = document.createElement('div');
    colEffect.className = 'flame-effect flame-col';
    colEffect.style.top = '0px';
    colEffect.style.left = `${col * (cellSize + gap)}px`;
    colEffect.style.width = `${cellSize}px`;
    colEffect.style.height = `${gemBoard.offsetHeight}px`;
    gemBoard.appendChild(colEffect);
    
    // 移除特效
    setTimeout(() => {
        if (rowEffect.parentNode) {
            rowEffect.remove();
        }
        if (colEffect.parentNode) {
            colEffect.remove();
        }
    }, 500);
}

// 应用重力（符石下落）
function applyGravity() {
    for (let col = 0; col < GAME_CONFIG.BOARD_SIZE; col++) {
        let writeIndex = GAME_CONFIG.BOARD_SIZE - 1;
        
        // 从下往上移动非空符石
        for (let row = GAME_CONFIG.BOARD_SIZE - 1; row >= 0; row--) {
            if (gameState.board[row][col] !== null) {
                if (writeIndex !== row) {
                    gameState.board[writeIndex][col] = gameState.board[row][col];
                    gameState.board[row][col] = null;
                }
                writeIndex--;
            }
        }
    }
}

// 填充空位
function fillEmptySpaces() {
    for (let row = 0; row < GAME_CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < GAME_CONFIG.BOARD_SIZE; col++) {
            if (gameState.board[row][col] === null) {
                gameState.board[row][col] = getRandomGemType();
            }
        }
    }
}

// 更新UI
function updateUI() {
    // 更新符石棋盘
    const gemBoard = document.getElementById('gemBoard');
    gemBoard.innerHTML = '';
    
    for (let row = 0; row < GAME_CONFIG.BOARD_SIZE; row++) {
        for (let col = 0; col < GAME_CONFIG.BOARD_SIZE; col++) {
            const gemType = gameState.board[row][col];
            if (gemType) {
                const gem = createGemElement(row, col, gemType);
                gemBoard.appendChild(gem);
            }
        }
    }

    // 更新敌人血条
    const enemyHpFill = document.getElementById('enemyHpFill');
    const enemyHpText = document.getElementById('enemyHpText');
    if (gameState.currentEnemy) {
        const enemyMaxHp = gameState.currentEnemy.maxHp;
        const enemyHpPercent = (gameState.enemyHp / enemyMaxHp) * 100;
        enemyHpFill.style.width = `${enemyHpPercent}%`;
        enemyHpText.textContent = `${gameState.enemyHp}/${enemyMaxHp}`;
    }

    // 更新玩家血条
    const playerHpFill = document.getElementById('playerHpFill');
    const playerHpText = document.getElementById('playerHpText');
    const playerHpPercent = (gameState.playerHp / playerMaxHp) * 100;
    playerHpFill.style.width = `${playerHpPercent}%`;
    playerHpText.textContent = `${gameState.playerHp}/${playerMaxHp}`;
}

// 显示技能范围预览（右侧面板）
function showSkillRangePreview(hero) {
    const previewGrid = document.getElementById('previewGrid');
    const previewPanel = document.getElementById('skillPreviewPanel');
    const skillDescription = document.getElementById('skillDescription');
    
    previewGrid.innerHTML = '';
    
    // 显示技能效果描述
    if (skillDescription && hero.skillDescription) {
        skillDescription.textContent = hero.skillDescription;
        skillDescription.style.display = 'block';
    } else if (skillDescription) {
        skillDescription.style.display = 'none';
    }
    
    const range = hero.skillRange;
    const maxSize = Math.max(range.width, range.height, 4); // 至少4x4的预览网格
    
    // 创建预览网格
    previewGrid.style.gridTemplateColumns = `repeat(${maxSize}, 1fr)`;
    previewGrid.style.gridTemplateRows = `repeat(${maxSize}, 1fr)`;
    
    // 计算范围在预览网格中的位置（居中显示）
    const startRow = Math.floor((maxSize - range.height) / 2);
    const startCol = Math.floor((maxSize - range.width) / 2);
    
    // 生成预览网格
    for (let r = 0; r < maxSize; r++) {
        for (let c = 0; c < maxSize; c++) {
            const cell = document.createElement('div');
            cell.className = 'preview-cell';
            
            // 判断是否在技能范围内
            if (r >= startRow && r < startRow + range.height &&
                c >= startCol && c < startCol + range.width) {
                cell.classList.add('preview-cell-active');
                // 显示属性图标
                cell.textContent = GAME_CONFIG.GEM_EMOJIS[hero.attribute];
            }
            
            previewGrid.appendChild(cell);
        }
    }
    
    previewPanel.style.display = 'block';
}

// 隐藏技能范围预览
function hideSkillRangePreview() {
    const previewPanel = document.getElementById('skillPreviewPanel');
    previewPanel.style.display = 'none';
}

// 重置选择
function resetSelection() {
    gameState.selectedHero = null;
    gameState.isSelectingArea = false;
    
    // 清除预览
    clearSkillPreview();
    hideSkillRangePreview();
    
    document.querySelectorAll('.hero-portrait').forEach(el => {
        el.classList.remove('selected');
    });
    
    updateTurnIndicator('选择英雄释放技能');
}

// 更新回合指示器
function updateTurnIndicator(text) {
    const turnIndicator = document.getElementById('turnIndicator');
    turnIndicator.textContent = text;
}

// 敌人回合
function enemyTurn() {
    gameState.isPlayerTurn = false;
    updateTurnIndicator('敌人回合...');
    
    // 敌人攻击玩家（使用配置的伤害范围）
    let enemyDamage = 500;
    if (gameState.currentEnemy) {
        const minDamage = gameState.currentEnemy.minDamage || 500;
        const maxDamage = gameState.currentEnemy.maxDamage || 1000;
        enemyDamage = minDamage + Math.floor(Math.random() * (maxDamage - minDamage + 1));
    } else {
        enemyDamage = 500 + Math.floor(Math.random() * 500);
    }
    
    gameState.playerHp = Math.max(0, gameState.playerHp - enemyDamage);
    
    setTimeout(() => {
        updateUI();
        
        // 检查失败条件
        if (gameState.playerHp <= 0) {
            setTimeout(() => {
                const enemyName = gameState.currentEnemy ? gameState.currentEnemy.name : '敌人';
                alert(`失败！你被${enemyName}击败了！`);
                resetGame();
            }, 500);
            return;
        }
        
        // 切换回玩家回合
        gameState.isPlayerTurn = true;
        updateTurnIndicator('选择英雄释放技能');
    }, 1000);
}

// 获取下一关
function getNextLevel() {
    if (!gameConfigData || !gameConfigData.levels || !currentLevel) {
        console.log('无法获取下一关: 配置数据或当前关卡为空');
        return null;
    }
    
    const currentLevelIndex = gameConfigData.levels.findIndex(level => level.id === currentLevel.id);
    console.log('当前关卡索引:', currentLevelIndex, '总关卡数:', gameConfigData.levels.length);
    
    if (currentLevelIndex === -1) {
        console.warn('未找到当前关卡在配置中的位置');
        return null;
    }
    
    if (currentLevelIndex >= gameConfigData.levels.length - 1) {
        console.log('已经是最后一关');
        return null; // 没有下一关
    }
    
    const nextLevel = gameConfigData.levels[currentLevelIndex + 1];
    console.log('下一关:', nextLevel);
    return nextLevel;
}

// 进入下一关
function goToNextLevel() {
    const nextLevel = getNextLevel();
    
    if (nextLevel) {
        // 有下一关，进入下一关
        setTimeout(() => {
            startLevel(nextLevel);
        }, 500);
    } else {
        // 没有下一关，显示通关信息
        setTimeout(() => {
            alert('恭喜！你已经通关所有关卡！');
            // 返回关卡选择界面
            showLevelSelect();
        }, 500);
    }
}

// 重置游戏
function resetGame() {
    if (currentLevel) {
        gameState.enemyHp = currentLevel.enemy.maxHp;
        gameState.playerHp = playerMaxHp; // 使用全局配置的玩家最大生命值
    } else {
        gameState.enemyHp = 500;
        gameState.playerHp = playerMaxHp;
    }
    gameState.isPlayerTurn = true;
    resetSelection();
    createBoard();
    updateUI();
}

// 返回关卡选择
function backToLevelSelect() {
    showLevelSelect();
    resetSelection();
}

// 设置事件监听器
function setupEventListeners() {
    // 当鼠标离开棋盘时清除预览
    const gemBoard = document.getElementById('gemBoard');
    if (gemBoard) {
        gemBoard.addEventListener('mouseleave', () => {
            clearSkillPreview();
        });
    }
    
    // 返回关卡选择按钮
    const backBtn = document.getElementById('backToLevelsBtn');
    if (backBtn) {
        backBtn.addEventListener('click', backToLevelSelect);
    }
}

// 显示关卡选择界面
function showLevelSelect() {
    const levelSelectScreen = document.getElementById('levelSelectScreen');
    const gameContainer = document.getElementById('gameContainer');
    
    if (levelSelectScreen) {
        levelSelectScreen.style.display = 'flex';
    }
    if (gameContainer) {
        gameContainer.style.display = 'none';
    }
    
    initLevelSelect();
    initLevelSelectButtons();
}

// 返回游戏
function backToGame() {
    document.getElementById('levelSelectScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'flex';
}

// 启动应用
async function startApp() {
    const config = await loadConfig();
    gameConfigData = config; // 确保gameConfigData被设置
    
    // 确保玩家配置已读取（如果loadConfig中没有读取，这里再次读取）
    if (gameConfigData && gameConfigData.player && gameConfigData.player.initialHp) {
        playerMaxHp = gameConfigData.player.initialHp;
    }
    
    // 初始化关卡选择界面的按钮事件
    initLevelSelectButtons();
    
    // 初始化关卡选择界面（但不显示）
    initLevelSelect();
    
    // 自动加载第一个关卡并开始游戏
    if (gameConfigData && gameConfigData.levels && gameConfigData.levels.length > 0) {
        console.log('开始第一关:', gameConfigData.levels[0]);
        startLevel(gameConfigData.levels[0]);
    } else {
        console.warn('没有找到关卡配置，使用默认关卡');
        // 如果没有关卡配置，使用默认配置
        const defaultConfig = getDefaultConfig();
        gameConfigData = defaultConfig;
        if (defaultConfig.player && defaultConfig.player.initialHp) {
            playerMaxHp = defaultConfig.player.initialHp;
        }
        startLevel(defaultConfig.levels[0]);
    }
}

// 启动应用
startApp();
