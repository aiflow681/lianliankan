// 连连看游戏 - 纯H5实现
class LinkGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // 游戏状态
        this.currentLevel = 1;
        this.maxLevel = 9;
        this.timeLimit = 180; // 3分钟
        this.timeLeft = this.timeLimit;
        this.bombs = 3;
        this.score = 0;
        this.isPlaying = false;
        this.isPaused = false;
        
        // 游戏板
        this.rows = 8;
        this.cols = 10;
        this.board = [];
        this.selectedTile = null;
        
        // 图块类型（使用emoji）
        this.tileTypes = ['🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍑', '🥝', '🍒', 
                          '🍍', '🥥', '🥭', '🍏', '🍐', '🫐', '🍈', '🥑'];
        
        // 布局
        this.padding = 20;
        this.updateLayout();
        
        // 事件监听
        this.canvas.addEventListener('click', (e) => this.handleClick(e));
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // 初始化关卡选择
        this.initLevelSelect();
    }
    
    resizeCanvas() {
        const container = document.getElementById('gameContainer');
        const rect = container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        this.updateLayout();
        if (this.isPlaying) {
            this.draw();
        }
    }
    
    updateLayout() {
        const infoHeight = 60;
        const availableHeight = this.canvas.height - infoHeight - this.padding * 2;
        const availableWidth = this.canvas.width - this.padding * 2;
        
        this.tileSize = Math.min(
            availableWidth / this.cols,
            availableHeight / this.rows
        ) * 0.9;
        
        this.offsetX = (this.canvas.width - this.tileSize * this.cols) / 2;
        this.offsetY = infoHeight + (this.canvas.height - infoHeight - this.tileSize * this.rows) / 2;
    }
    
    initLevelSelect() {
        const container = document.getElementById('levelSelect');
        container.innerHTML = '';
        for (let i = 1; i <= this.maxLevel; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.textContent = `第 ${i} 关`;
            btn.onclick = () => this.startLevel(i);
            container.appendChild(btn);
        }
    }
    
    showStart() {
        document.getElementById('startScreen').classList.remove('hidden');
        document.getElementById('levelScreen').classList.add('hidden');
        document.getElementById('gameoverScreen').classList.add('hidden');
        document.getElementById('gameInfo').classList.add('hidden');
        this.isPlaying = false;
    }
    
    showLevelSelect() {
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('levelScreen').classList.remove('hidden');
        document.getElementById('gameoverScreen').classList.add('hidden');
        document.getElementById('gameInfo').classList.add('hidden');
        this.isPlaying = false;
    }
    
    startLevel(level) {
        this.currentLevel = level;
        this.timeLeft = this.timeLimit;
        this.bombs = 3;
        this.isPlaying = true;
        this.isPaused = false;
        
        // 根据关卡调整难度
        this.rows = 6 + Math.floor(level / 3);
        this.cols = 8 + Math.floor(level / 3);
        this.updateLayout();
        
        // 隐藏所有屏幕
        document.getElementById('startScreen').classList.add('hidden');
        document.getElementById('levelScreen').classList.add('hidden');
        document.getElementById('gameoverScreen').classList.add('hidden');
        document.getElementById('gameInfo').classList.remove('hidden');
        
        // 更新显示
        document.getElementById('levelDisplay').textContent = level;
        document.getElementById('bombDisplay').textContent = this.bombs;
        
        // 初始化游戏板
        this.initBoard();
        this.draw();
        
        // 开始计时
        if (this.timer) clearInterval(this.timer);
        this.timer = setInterval(() => this.updateTimer(), 1000);
    }
    
    initBoard() {
        // 创建空白游戏板
        this.board = Array(this.rows).fill(null).map(() => 
            Array(this.cols).fill(null).map(() => ({ type: null, matched: false }))
        );
        
        // 计算需要的图块对数
        const totalTiles = this.rows * this.cols;
        const pairsNeeded = Math.floor(totalTiles / 2);
        
        // 创建图块对
        const tiles = [];
        const typesNeeded = Math.min(pairsNeeded, this.tileTypes.length);
        
        for (let i = 0; i < pairsNeeded; i++) {
            const type = this.tileTypes[i % typesNeeded];
            tiles.push(type, type);
        }
        
        // 洗牌
        for (let i = tiles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
        }
        
        // 填充游戏板
        let index = 0;
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                if (index < tiles.length) {
                    this.board[row][col] = {
                        type: tiles[index++],
                        matched: false
                    };
                } else {
                    // 如果是奇数格子，最后一个设为已匹配（不显示）
                    this.board[row][col] = {
                        type: null,
                        matched: true
                    };
                }
            }
        }
        
        this.selectedTile = null;
    }
    
    draw() {
        // 清空画布
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制游戏板
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const tile = this.board[row][col];
                if (tile.type && !tile.matched) {
                    this.drawTile(row, col, tile.type);
                }
            }
        }
        
        // 绘制选中的图块高亮
        if (this.selectedTile) {
            const { row, col } = this.selectedTile;
            this.drawHighlight(row, col);
        }
    }
    
    drawTile(row, col, type) {
        const x = this.offsetX + col * this.tileSize;
        const y = this.offsetY + row * this.tileSize;
        const size = this.tileSize * 0.9;
        
        // 绘制图块背景
        this.ctx.fillStyle = '#fff';
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, 8);
        this.ctx.fill();
        this.ctx.stroke();
        
        // 绘制图块内容（emoji）
        this.ctx.font = `${size * 0.6}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#333';
        this.ctx.fillText(type, x + size / 2, y + size / 2);
    }
    
    drawHighlight(row, col) {
        const x = this.offsetX + col * this.tileSize;
        const y = this.offsetY + row * this.tileSize;
        const size = this.tileSize * 0.9;
        
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.roundRect(x, y, size, size, 8);
        this.ctx.stroke();
    }
    
    handleClick(e) {
        if (!this.isPlaying || this.isPaused) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 转换为游戏板坐标
        const col = Math.floor((x - this.offsetX) / this.tileSize);
        const row = Math.floor((y - this.offsetY) / this.tileSize);
        
        // 检查是否在有效范围内
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
        
        const tile = this.board[row][col];
        if (!tile.type || tile.matched) return;
        
        // 如果没有选中的图块
        if (!this.selectedTile) {
            this.selectedTile = { row, col };
            this.draw();
            return;
        }
        
        // 如果点击同一个图块，取消选择
        if (this.selectedTile.row === row && this.selectedTile.col === col) {
            this.selectedTile = null;
            this.draw();
            return;
        }
        
        // 检查是否可以连接
        const tile1 = this.board[this.selectedTile.row][this.selectedTile.col];
        const tile2 = this.board[row][col];
        
        if (tile1.type === tile2.type && this.canConnect(this.selectedTile, { row, col })) {
            // 匹配成功
            tile1.matched = true;
            tile2.matched = true;
            this.selectedTile = null;
            this.draw();
            
            // 检查是否完成
            if (this.checkWin()) {
                this.gameOver(true);
            }
        } else {
            // 匹配失败，选择新的图块
            this.selectedTile = { row, col };
            this.draw();
        }
    }
    
    canConnect(pos1, pos2) {
        // 简化的连接算法：检查直线连接或一次转弯
        
        // 直线连接
        if (pos1.row === pos2.row) {
            if (this.isPathClear(pos1.row, pos1.col, pos1.row, pos2.col, true)) {
                return true;
            }
        }
        if (pos1.col === pos2.col) {
            if (this.isPathClear(pos1.row, pos1.col, pos2.row, pos1.col, false)) {
                return true;
            }
        }
        
        // 一次转弯
        // 尝试通过 (pos1.row, pos2.col) 转弯
        const corner1 = this.board[pos1.row][pos2.col];
        if ((!corner1.type || corner1.matched) && 
            this.isPathClear(pos1.row, pos1.col, pos1.row, pos2.col, true) &&
            this.isPathClear(pos1.row, pos2.col, pos2.row, pos2.col, false)) {
            return true;
        }
        
        // 尝试通过 (pos2.row, pos1.col) 转弯
        const corner2 = this.board[pos2.row][pos1.col];
        if ((!corner2.type || corner2.matched) &&
            this.isPathClear(pos1.row, pos1.col, pos2.row, pos1.col, false) &&
            this.isPathClear(pos2.row, pos1.col, pos2.row, pos2.col, true)) {
            return true;
        }
        
        return false;
    }
    
    isPathClear(row1, col1, row2, col2, isHorizontal) {
        if (isHorizontal) {
            const minCol = Math.min(col1, col2);
            const maxCol = Math.max(col1, col2);
            for (let col = minCol + 1; col < maxCol; col++) {
                const tile = this.board[row1][col];
                if (tile.type && !tile.matched) {
                    return false;
                }
            }
        } else {
            const minRow = Math.min(row1, row2);
            const maxRow = Math.max(row1, row2);
            for (let row = minRow + 1; row < maxRow; row++) {
                const tile = this.board[row][col1];
                if (tile.type && !tile.matched) {
                    return false;
                }
            }
        }
        return true;
    }
    
    checkWin() {
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const tile = this.board[row][col];
                if (tile.type && !tile.matched) {
                    return false;
                }
            }
        }
        return true;
    }
    
    updateTimer() {
        if (!this.isPlaying || this.isPaused) return;
        
        this.timeLeft--;
        const minutes = Math.floor(this.timeLeft / 60);
        const seconds = this.timeLeft % 60;
        document.getElementById('timeDisplay').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        if (this.timeLeft <= 0) {
            this.gameOver(false);
        }
    }
    
    gameOver(won) {
        this.isPlaying = false;
        if (this.timer) clearInterval(this.timer);
        
        const title = document.getElementById('gameoverTitle');
        const message = document.getElementById('gameoverMessage');
        
        if (won) {
            title.textContent = '🎉 恭喜过关！';
            message.textContent = `用时：${this.timeLimit - this.timeLeft}秒`;
        } else {
            title.textContent = '⏰ 时间到！';
            message.textContent = '再试一次吧！';
        }
        
        document.getElementById('gameoverScreen').classList.remove('hidden');
        document.getElementById('gameInfo').classList.add('hidden');
    }
    
    retry() {
        this.startLevel(this.currentLevel);
    }
    
    nextLevel() {
        if (this.currentLevel < this.maxLevel) {
            this.startLevel(this.currentLevel + 1);
        } else {
            this.showLevelSelect();
        }
    }
}

// 初始化游戏
const game = new LinkGame();
