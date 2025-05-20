const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('next-piece');
const nextPieceContext = nextPieceCanvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const highScoreElement = document.getElementById('high-score');
const gameOverElement = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');

context.scale(30, 30);
nextPieceContext.scale(30, 30);

// テトリミノの形状定義（回転用の定義を追加）
const SHAPES = {
    I: [
        [[0, 0, 0, 0],
         [1, 1, 1, 1],
         [0, 0, 0, 0],
         [0, 0, 0, 0]],
        [[0, 0, 1, 0],
         [0, 0, 1, 0],
         [0, 0, 1, 0],
         [0, 0, 1, 0]],
        [[0, 0, 0, 0],
         [0, 0, 0, 0],
         [1, 1, 1, 1],
         [0, 0, 0, 0]],
        [[0, 1, 0, 0],
         [0, 1, 0, 0],
         [0, 1, 0, 0],
         [0, 1, 0, 0]]
    ],
    O: [
        [[1, 1],
         [1, 1]]
    ],
    T: [
        [[0, 1, 0],
         [1, 1, 1],
         [0, 0, 0]],
        [[0, 1, 0],
         [0, 1, 1],
         [0, 1, 0]],
        [[0, 0, 0],
         [1, 1, 1],
         [0, 1, 0]],
        [[0, 1, 0],
         [1, 1, 0],
         [0, 1, 0]]
    ],
    L: [
        [[0, 0, 1],
         [1, 1, 1],
         [0, 0, 0]],
        [[0, 1, 0],
         [0, 1, 0],
         [0, 1, 1]],
        [[0, 0, 0],
         [1, 1, 1],
         [1, 0, 0]],
        [[1, 1, 0],
         [0, 1, 0],
         [0, 1, 0]]
    ],
    J: [
        [[1, 0, 0],
         [1, 1, 1],
         [0, 0, 0]],
        [[0, 1, 1],
         [0, 1, 0],
         [0, 1, 0]],
        [[0, 0, 0],
         [1, 1, 1],
         [0, 0, 1]],
        [[0, 1, 0],
         [0, 1, 0],
         [1, 1, 0]]
    ],
    S: [
        [[0, 1, 1],
         [1, 1, 0],
         [0, 0, 0]],
        [[0, 1, 0],
         [0, 1, 1],
         [0, 0, 1]],
        [[0, 0, 0],
         [0, 1, 1],
         [1, 1, 0]],
        [[1, 0, 0],
         [1, 1, 0],
         [0, 1, 0]]
    ],
    Z: [
        [[1, 1, 0],
         [0, 1, 1],
         [0, 0, 0]],
        [[0, 0, 1],
         [0, 1, 1],
         [0, 1, 0]],
        [[0, 0, 0],
         [1, 1, 0],
         [0, 1, 1]],
        [[0, 1, 0],
         [1, 1, 0],
         [1, 0, 0]]
    ]
};

// 色の定義
const COLORS = [
    '#00f0f0', // I - Cyan
    '#f0f000', // O - Yellow
    '#a000f0', // T - Purple
    '#f0a000', // L - Orange
    '#0000f0', // J - Blue
    '#00f000', // S - Green
    '#f00000'  // Z - Red
];

let score = 0;
let highScore = localStorage.getItem('tetrisHighScore') || 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameOver = false;
let nextPiece = null;

// ストック用のキャンバス
const holdCanvas = document.getElementById('hold-piece');
const holdContext = holdCanvas.getContext('2d');
holdContext.scale(30, 30);

// プレイヤーオブジェクト
const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    color: null,
    type: null,
    rotation: 0,
    lastTSpin: false,
    canHold: true  // ホールド可能かどうかのフラグ
};

// ストックされたブロック
let holdPiece = null;

// ゲームフィールド
const arena = createMatrix(10, 20);

// マトリックス作成関数
function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

// 衝突判定
function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] === undefined ||
                arena[y + o.y][x + o.x] === undefined ||
                arena[y + o.y][x + o.x] !== 0)) {
                return true;
            }
        }
    }
    return false;
}

// ゴーストピースの位置を計算
function getGhostPosition() {
    const ghost = {
        pos: {x: player.pos.x, y: player.pos.y},
        matrix: player.matrix
    };
    
    while (!collide(arena, ghost)) {
        ghost.pos.y++;
    }
    ghost.pos.y--;
    
    return ghost;
}

// マトリックスの描画
function drawMatrix(matrix, offset, context, color, isGhost = false) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const blockColor = typeof value === 'object' ? value.color : color;
                
                if (isGhost) {
                    // ゴーストピースの描画
                    context.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    context.fillRect(x + offset.x,
                                   y + offset.y,
                                   1, 1);
                    
                    // ゴーストピースの境界線
                    context.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                    context.lineWidth = 0.05;
                    context.strokeRect(x + offset.x,
                                     y + offset.y,
                                     1, 1);
                } else {
                    // 通常のブロックの描画
                    context.fillStyle = blockColor;
                    context.fillRect(x + offset.x,
                                   y + offset.y,
                                   1, 1);
                    
                    // ブロックの境界線
                    context.strokeStyle = 'rgba(0, 0, 0, 0.3)';
                    context.lineWidth = 0.05;
                    context.strokeRect(x + offset.x,
                                     y + offset.y,
                                     1, 1);
                    
                    // ブロックのハイライト（左上）
                    context.fillStyle = 'rgba(255, 255, 255, 0.2)';
                    context.beginPath();
                    context.moveTo(x + offset.x, y + offset.y);
                    context.lineTo(x + offset.x + 1, y + offset.y);
                    context.lineTo(x + offset.x, y + offset.y + 1);
                    context.fill();
                    
                    // ブロックのシャドウ（右下）
                    context.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    context.beginPath();
                    context.moveTo(x + offset.x + 1, y + offset.y);
                    context.lineTo(x + offset.x + 1, y + offset.y + 1);
                    context.lineTo(x + offset.x, y + offset.y + 1);
                    context.fill();
                }
            }
        });
    });
}

// ゲームフィールドの描画
function draw() {
    // 背景
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // グリッド線
    context.strokeStyle = '#333';
    context.lineWidth = 0.02;
    
    // 縦線
    for (let x = 0; x <= 10; x++) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, 20);
        context.stroke();
    }
    
    // 横線
    for (let y = 0; y <= 20; y++) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(10, y);
        context.stroke();
    }
    
    // ゴーストピースの描画
    const ghost = getGhostPosition();
    drawMatrix(ghost.matrix, ghost.pos, context, player.color, true);
    
    // ブロックの描画
    drawMatrix(arena, {x: 0, y: 0}, context);
    drawMatrix(player.matrix, player.pos, context, player.color);
}

// 次のブロックの描画
function drawNextPiece() {
    nextPieceContext.fillStyle = '#000';
    nextPieceContext.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);
    if (nextPiece) {
        const offset = {
            x: (nextPieceCanvas.width / 30 - nextPiece.matrix[0].length) / 2,
            y: (nextPieceCanvas.height / 30 - nextPiece.matrix.length) / 2
        };
        drawMatrix(nextPiece.matrix, offset, nextPieceContext, nextPiece.color);
    }
}

// マトリックスのマージ
function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = {
                    value: value,
                    color: player.color
                };
            }
        });
    });
}

// Tスピン判定用の関数
function checkTSpin() {
    if (player.type !== 'T') return false;
    
    const pos = player.pos;
    const matrix = player.matrix;
    let cornerCount = 0;
    
    // 4つの角をチェック
    const corners = [
        {x: pos.x - 1, y: pos.y - 1},     // 左上
        {x: pos.x + matrix[0].length, y: pos.y - 1},  // 右上
        {x: pos.x - 1, y: pos.y + matrix.length},     // 左下
        {x: pos.x + matrix[0].length, y: pos.y + matrix.length}  // 右下
    ];
    
    corners.forEach(corner => {
        if (corner.x >= 0 && corner.x < arena[0].length &&
            corner.y >= 0 && corner.y < arena.length &&
            arena[corner.y][corner.x] !== 0) {
            cornerCount++;
        }
    });
    
    // 3つ以上の角が埋まっている場合、Tスピン成立
    return cornerCount >= 3;
}

// プレイヤーの回転
function playerRotate(dir) {
    const pos = player.pos.x;
    let offset = 1;
    const originalRotation = player.rotation;
    const wasTSpin = checkTSpin(); // 回転前のTスピン状態をチェック
    
    // 回転状態を更新
    player.rotation = (player.rotation + (dir > 0 ? 1 : -1) + 4) % 4;
    player.matrix = SHAPES[player.type][player.rotation];
    
    // 回転後の衝突チェックと位置調整
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        
        // 壁に当たった場合は回転をキャンセル
        if (Math.abs(offset) > player.matrix[0].length) {
            player.rotation = originalRotation;
            player.matrix = SHAPES[player.type][player.rotation];
            player.pos.x = pos;
            return;
        }
    }
    
    // Tスピン状態を保存
    player.lastTSpin = wasTSpin;
}

// プレイヤーの移動
function playerMove(dir) {
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

// プレイヤーのドロップ
function playerDrop() {
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        const wasTSpin = player.lastTSpin;
        playerReset();
        arenaSweep(wasTSpin);
        updateScore();
    }
    dropCounter = 0;
}

// プレイヤーのハードドロップ
function playerHardDrop() {
    while (!collide(arena, player)) {
        player.pos.y++;
    }
    player.pos.y--;
    merge(arena, player);
    const wasTSpin = player.lastTSpin;
    playerReset();
    arenaSweep(wasTSpin);
    updateScore();
    dropCounter = 0;
}

// 新しいブロックの生成
function createPiece() {
    const types = Object.keys(SHAPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const color = COLORS[types.indexOf(type)];
    return {
        matrix: SHAPES[type][0],
        color: color,
        type: type,
        rotation: 0
    };
}

// ストックされたブロックの描画
function drawHoldPiece() {
    holdContext.fillStyle = '#000';
    holdContext.fillRect(0, 0, holdCanvas.width, holdCanvas.height);
    if (holdPiece) {
        const offset = {
            x: (holdCanvas.width / 30 - holdPiece.matrix[0].length) / 2,
            y: (holdCanvas.height / 30 - holdPiece.matrix.length) / 2
        };
        drawMatrix(holdPiece.matrix, offset, holdContext, holdPiece.color);
    }
}

// ブロックをストックする
function holdPiece() {
    if (!player.canHold) return;
    
    if (holdPiece === null) {
        // 初めてホールドする場合
        holdPiece = {
            matrix: player.matrix,
            color: player.color,
            type: player.type
        };
        playerReset();
    } else {
        // ストックと現在のブロックを交換
        const temp = {
            matrix: holdPiece.matrix,
            color: holdPiece.color,
            type: holdPiece.type
        };
        holdPiece = {
            matrix: player.matrix,
            color: player.color,
            type: player.type
        };
        player.matrix = temp.matrix;
        player.color = temp.color;
        player.type = temp.type;
        player.rotation = 0;
        player.pos.y = 0;
        player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);
    }
    
    player.canHold = false;
    drawHoldPiece();
}

// プレイヤーのリセット
function playerReset() {
    if (nextPiece === null) {
        nextPiece = createPiece();
    }
    player.matrix = nextPiece.matrix;
    player.color = nextPiece.color;
    player.type = nextPiece.type;
    player.rotation = 0;
    player.canHold = true;  // ホールド可能にリセット
    nextPiece = createPiece();
    drawNextPiece();
    
    player.pos.y = 0;
    player.pos.x = Math.floor(arena[0].length / 2) - Math.floor(player.matrix[0].length / 2);
    
    if (collide(arena, player)) {
        gameOver = true;
        showGameOver();
        return false;
    }
    return true;
}

// ゲームオーバー表示
function showGameOver() {
    finalScoreElement.textContent = score;
    gameOverElement.style.display = 'block';
}

// ゲームリスタート
function restartGame() {
    // ゲームフィールドのリセット
    arena.forEach(row => row.fill(0));
    
    // スコアとレベルのリセット
    score = 0;
    level = 1;
    dropInterval = 1000;
    
    // ゲーム状態のリセット
    gameOver = false;
    dropCounter = 0;
    lastTime = 0;
    
    // 次のブロックとストックのリセット
    nextPiece = null;
    holdPiece = null;
    
    // UIの更新
    gameOverElement.style.display = 'none';
    updateScore();
    drawHoldPiece();
    
    // 新しいブロックの生成
    if (!playerReset()) {
        return;
    }
    
    // ゲームループの再開
    requestAnimationFrame(update);
}

// ラインの消去
function arenaSweep(wasTSpin = false) {
    let rowCount = 0;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }
        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;
        rowCount++;
    }
    
    if (rowCount > 0) {
        // スコア計算
        const baseScore = rowCount * 100;
        const levelBonus = Math.pow(2, rowCount - 1); // 複数行同時消去のボーナス
        
        // Tスピンボーナス
        let tSpinBonus = 1;
        if (wasTSpin) {
            tSpinBonus = rowCount === 1 ? 2 : 4; // Tスピンシングル: 2倍、Tスピンダブル/トリプル: 4倍
        }
        
        score += baseScore * levelBonus * level * tSpinBonus;
        
        // レベルアップ判定
        if (score >= level * 1000) {
            level++;
            dropInterval = Math.max(100, 1000 - (level - 1) * 100);
        }
        
        // ハイスコア更新
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('tetrisHighScore', highScore);
        }
        updateScore();
    }
}

// スコアの更新
function updateScore() {
    scoreElement.textContent = 'スコア: ' + score;
    levelElement.textContent = level;
    highScoreElement.textContent = highScore;
}

// ゲームループ
function update(time = 0) {
    if (gameOver) {
        return;
    }

    const deltaTime = time - lastTime;
    lastTime = time;
    dropCounter += deltaTime;
    
    // ドロップ間隔を超えた場合のみドロップ処理を実行
    if (dropCounter > dropInterval) {
        playerDrop();
    }
    
    draw();
    requestAnimationFrame(update);
}

// キーボード操作
document.addEventListener('keydown', event => {
    // 矢印キーのデフォルト動作を防ぐ
    if ([37, 38, 39, 40].includes(event.keyCode)) {
        event.preventDefault();
    }
    
    if (gameOver) {
        // ゲームオーバー時にEnterキーでリスタート
        if (event.keyCode === 13) { // Enterキー
            restartGame();
        }
        return;
    }
    
    // キー入力の処理
    switch (event.keyCode) {
        case 37: // 左矢印
            playerMove(-1);
            break;
        case 39: // 右矢印
            playerMove(1);
            break;
        case 40: // 下矢印
            playerDrop();
            break;
        case 38: // 上矢印
            playerHardDrop();
            break;
        case 81: // Q
            playerRotate(-1);
            break;
        case 87: // W
            playerRotate(1);
            break;
        case 67: // C
            holdPiece();
            break;
    }
});

// リスタートボタンのイベントリスナー
restartButton.addEventListener('click', () => {
    restartGame();
});

// 初期化
highScoreElement.textContent = highScore;
playerReset();
updateScore();
update(); 