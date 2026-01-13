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
    { id: 0, name: '火之战士', attribute: 'fire', emoji: '⚔️', skillRange: { width: 1, height: 4 } }, // 1x4 竖条
    { id: 1, name: '水之法师', attribute: 'water', emoji: '🧙', skillRange: { width: 2, height: 3 } }, // 2x3 矩形
    { id: 2, name: '木之德鲁伊', attribute: 'wood', emoji: '🌳', skillRange: { width: 2, height: 4 } }, // 2x4 矩形
    { id: 3, name: '光之圣骑士', attribute: 'light', emoji: '🛡️', skillRange: { width: 3, height: 3 } }, // 3x3 正方形
    { id: 4, name: '暗之刺客', attribute: 'dark', emoji: '🗡️', skillRange: { width: 4, height: 1 } }, // 4x1 横条
    { id: 5, name: '火之法师', attribute: 'fire', emoji: '🔥', skillRange: { width: 2, height: 1 } } // 2x1 横条
];

// 加载配置文件
async function loadConfig() {
    try {
        const response = await fetch('config.json');
        gameConfigData = await response.json();
        return gameConfigData;
    } catch (error) {
        console.error('加载配置文件失败:', error);
        // 使用默认配置
        return {
            levels: [{
                id: 1,
                name: "默认关卡",
                enemy: {
                    name: "暗影巫妖",
                    emoji: "👹",
                    maxHp: 500,
                    minDamage: 500,
                    maxDamage: 1000
                },
                player: {
                    maxHp: 10000
                }
            }]
        };
    }
}

// 初始化关卡选择界面
function initLevelSelect() {
    const levelsList = document.getElementById('levelsList');
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
                <span>玩家HP: ${level.player.maxHp.toLocaleString()}</span>
            </div>
        `;
        levelCard.addEventListener('click', () => startLevel(level));
        levelsList.appendChild(levelCard);
    });
    
    // 重新加载配置按钮
    document.getElementById('reloadConfigBtn').addEventListener('click', async () => {
        await loadConfig();
        initLevelSelect();
        alert('配置已重新加载！');
    });
    
    // 返回游戏按钮
    const backToGameBtn = document.getElementById('backToGameBtn');
    if (backToGameBtn) {
        backToGameBtn.addEventListener('click', backToGame);
    }
}

// 开始关卡
function startLevel(level) {
    currentLevel = level;
    gameState.currentEnemy = level.enemy;
    gameState.enemyHp = level.enemy.maxHp;
    gameState.playerHp = level.player.maxHp;
    
    // 隐藏关卡选择界面，显示游戏界面
    document.getElementById('levelSelectScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'flex';
    
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
    
    // 收集要消除的符石
    const gemsToRemove = [];
    skillArea.forEach(([r, c]) => {
        if (isValidPosition(r, c)) {
            gemsToRemove.push([r, c, gameState.board[r][c]]);
        }
    });

    // 计算所有会被消除的位置（包括炸弹触发的相邻位置）
    const allRemovedPositions = calculateAllRemovedPositions(gemsToRemove.map(([r, c]) => [r, c]));
    
    // 计算伤害（只计算有属性的符石，排除炸弹和烈火）
    const allRemovedGems = allRemovedPositions.map(([r, c]) => {
        const type = gameState.board[r][c];
        return [r, c, type];
    });
    const matchingGems = allRemovedGems.filter(([r, c, type]) => 
        type !== 'bomb' && type !== 'flame' && type === hero.attribute
    );
    const damage = calculateDamage(matchingGems.length);

    // 显示伤害
    showDamage(damage);

    // 消除符石
    removeGems(gemsToRemove.map(([r, c]) => [r, c]));

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
                    resetGame();
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
    if (currentLevel) {
        const playerMaxHp = currentLevel.player.maxHp;
        const playerHpPercent = (gameState.playerHp / playerMaxHp) * 100;
        playerHpFill.style.width = `${playerHpPercent}%`;
        playerHpText.textContent = `${gameState.playerHp}/${playerMaxHp}`;
    }
}

// 显示技能范围预览（右侧面板）
function showSkillRangePreview(hero) {
    const previewGrid = document.getElementById('previewGrid');
    const previewPanel = document.getElementById('skillPreviewPanel');
    previewGrid.innerHTML = '';
    
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

// 重置游戏
function resetGame() {
    if (currentLevel) {
        gameState.enemyHp = currentLevel.enemy.maxHp;
        gameState.playerHp = currentLevel.player.maxHp;
    } else {
        gameState.enemyHp = 500;
        gameState.playerHp = 10000;
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
    document.getElementById('levelSelectScreen').style.display = 'flex';
    document.getElementById('gameContainer').style.display = 'none';
    initLevelSelect();
}

// 返回游戏
function backToGame() {
    document.getElementById('levelSelectScreen').style.display = 'none';
    document.getElementById('gameContainer').style.display = 'flex';
}

// 启动应用
async function startApp() {
    await loadConfig();
    
    // 初始化关卡选择界面（但不显示）
    initLevelSelect();
    
    // 自动加载第一个关卡并开始游戏
    if (gameConfigData && gameConfigData.levels && gameConfigData.levels.length > 0) {
        startLevel(gameConfigData.levels[0]);
    } else {
        // 如果没有关卡配置，使用默认配置
        const defaultLevel = {
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
            },
            player: {
                maxHp: 10000
            }
        };
        startLevel(defaultLevel);
    }
}

// 启动应用
startApp();
