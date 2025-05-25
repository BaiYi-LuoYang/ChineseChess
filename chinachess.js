// 游戏核心逻辑
const board = document.getElementById('chessboard');
let selectedPiece = null;
let selectedCell = null;
let moveHistory = [];
let currentPlayer = 'red';
const playerDisplay = document.getElementById('current-player');
// 计时器相关变量
let timer;
let remainingTime = 30;
const timerDisplay = document.getElementById('timer');
// 音乐相关变量
const music = document.getElementById('game-music');
const musicBtn = document.getElementById('music-btn');
// 新增开始游戏按钮
const startGameBtn = document.getElementById('start-game-btn');
// 视频相关变量
const videoContainer = document.getElementById('video-container');
const tutorialVideo = document.getElementById('tutorial-video');
const playPauseBtn = document.getElementById('play-pause-btn');

// 移动验证器
const moveValidators = {
  '車': (fromX, fromY, toX, toY) => {
    if (fromX !== toX && fromY !== toY) return false;
    return isPathClear(fromX, fromY, toX, toY);
  },
  '俥': (fromX, fromY, toX, toY) => moveValidators['車'](fromX, fromY, toX, toY),

  '馬': (fromX, fromY, toX, toY) => {
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    if (!((dx === 2 && dy === 1) || (dx === 1 && dy === 2))) return false;
    const blockX = dx === 2 ? (fromX + toX)/2 : fromX;
    const blockY = dy === 2 ? (fromY + toY)/2 : fromY;
    return !document.querySelector(`[data-x="${blockX}"][data-y="${blockY}"] .piece`);
  },
  '傌': (fromX, fromY, toX, toY) => moveValidators['馬'](fromX, fromY, toX, toY),

  '象': (fromX, fromY, toX, toY) => {
    if (toY > 4) return false;
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    if (dx !== 2 || dy !== 2) return false;
    const eyeX = (fromX + toX) / 2;
    const eyeY = (fromY + toY) / 2;
    return !document.querySelector(`[data-x="${eyeX}"][data-y="${eyeY}"] .piece`);
  },
  '相': (fromX, fromY, toX, toY) => {
    if (toY < 5) return false;
    const dx = Math.abs(toX - fromX);
    const dy = Math.abs(toY - fromY);
    if (dx !== 2 || dy !== 2) return false;
    const eyeX = (fromX + toX) / 2;
    const eyeY = (fromY + toY) / 2;
    return !document.querySelector(`[data-x="${eyeX}"][data-y="${eyeY}"] .piece`);
  },

  '士': (fromX, fromY, toX, toY) => {
    const inPalace = toX >= 3 && toX <= 5 && toY >= 0 && toY <= 2;
    return Math.abs(toX - fromX) === 1 && Math.abs(toY - fromY) === 1 && inPalace;
  },
  '仕': (fromX, fromY, toX, toY) => {
    const inPalace = toX >= 3 && toX <= 5 && toY >= 7 && toY <= 9;
    return Math.abs(toX - fromX) === 1 && Math.abs(toY - fromY) === 1 && inPalace;
  },

  '將': (fromX, fromY, toX, toY) => {
    const inPalace = toX >= 3 && toX <= 5 && toY >= 0 && toY <= 2;
    const validMove = Math.abs(toX - fromX) + Math.abs(toY - fromY) === 1;
    return validMove && inPalace;
  },
  '帥': (fromX, fromY, toX, toY) => {
    const inPalace = toX >= 3 && toX <= 5 && toY >= 7 && toY <= 9;
    const validMove = Math.abs(toX - fromX) + Math.abs(toY - fromY) === 1;
    return validMove && inPalace;
  },

  '砲': (fromX, fromY, toX, toY) => {
    if (fromX !== toX && fromY !== toY) return false;
    const target = document.querySelector(`[data-x="${toX}"][data-y="${toY}"] .piece`);
    return target ? countPiecesBetween(fromX, fromY, toX, toY) === 1 : countPiecesBetween(fromX, fromY, toX, toY) === 0;
  },
  '炮': (fromX, fromY, toX, toY) => moveValidators['砲'](fromX, fromY, toX, toY),

  '卒': (fromX, fromY, toX, toY) => {
    const forward = toY - fromY === 1;
    const isCrossed = fromY >= 5;
    if (!isCrossed) return forward && toX === fromX;
    return (forward && toX === fromX) || (Math.abs(toX - fromX) === 1 && toY === fromY);
  },
  '兵': (fromX, fromY, toX, toY) => {
    const forward = fromY - toY === 1;
    const isCrossed = fromY <= 4;
    if (!isCrossed) return forward && toX === fromX;
    return (forward && toX === fromX) || (Math.abs(toX - fromX) === 1 && toY === fromY);
  }
};

// 路径检查函数
function isPathClear(fromX, fromY, toX, toY) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 1; i < steps; i++) {
    const x = fromX + Math.round(dx * i/steps);
    const y = fromY + Math.round(dy * i/steps);
    if (document.querySelector(`[data-x="${x}"][data-y="${y}"] .piece`)) return false;
  }
  return true;
}

// 棋子计数函数
function countPiecesBetween(fromX, fromY, toX, toY) {
  let count = 0;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 1; i < steps; i++) {
    const x = fromX + Math.round(dx * i/steps);
    const y = fromY + Math.round(dy * i/steps);
    if (document.querySelector(`[data-x="${x}"][data-y="${y}"] .piece`)) count++;
  }
  return count;
}

// 将帅照面检查
function checkGeneralFaceOff() {
  const generals = [...document.querySelectorAll('[data-type="將"], [data-type="帥"]')];
  if (generals.length !== 2) return false;
  const [g1, g2] = generals;
  const x1 = parseInt(g1.closest('.cell').dataset.x);
  const y1 = parseInt(g1.closest('.cell').dataset.y);
  const x2 = parseInt(g2.closest('.cell').dataset.x);
  const y2 = parseInt(g2.closest('.cell').dataset.y);
  if (x1 !== x2) return false;
  return countPiecesBetween(x1, y1, x2, y2) === 0;
}

// 创建棋盘网格线
function createGridLines() {
  // 水平线
  for (let y = 0; y <= 9; y++) {
    const line = document.createElement('div');
    line.className = 'grid-line horizontal';
    line.style.top = `${30 + y * 60}px`;
    board.appendChild(line);
  }

  // 垂直线
  for (let x = 0; x <= 8; x++) {
    const lineTop = document.createElement('div');
    lineTop.className = 'grid-line vertical-top';
    lineTop.style.left = `${30 + x * 60}px`;
    board.appendChild(lineTop);

    const lineBottom = document.createElement('div');
    lineBottom.className = 'grid-line vertical-bottom';
    lineBottom.style.left = `${30 + x * 60}px`;
    board.appendChild(lineBottom);
  }

  // 创建斜线
  const createDiagonal = (startX, startY, endX, endY) => {
    const line = document.createElement('div');
    line.className = 'diagonal-line';
    const deltaX = (endX - startX) * 60;
    const deltaY = (endY - startY) * 60;
    const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    line.style.width = `${length}px`;
    line.style.left = `${30 + startX * 60}px`;
    line.style.top = `${30 + startY * 60}px`;
    line.style.transform = `rotate(${Math.atan2(deltaY, deltaX)}rad)`;
    board.appendChild(line);
  };

  // 添加所有斜线
  [ [3,0,5,2], [5,0,3,2], [3,2,5,0], [5,2,3,0],
    [3,7,5,9], [5,7,3,9], [3,9,5,7], [5,9,3,7] ]
  .forEach(pos => createDiagonal(...pos));
}

// 初始棋子配置
const initialPieces = {
  // 黑方布局
  "0,0": { text: "車", color: "black" },
  "1,0": { text: "馬", color: "black" },
  "2,0": { text: "象", color: "black" },
  "3,0": { text: "士", color: "black" },
  "4,0": { text: "將", color: "black" },
  "5,0": { text: "士", color: "black" },
  "6,0": { text: "象", color: "black" },
  "7,0": { text: "馬", color: "black" },
  "8,0": { text: "車", color: "black" },
  "1,2": { text: "砲", color: "black" },
  "7,2": { text: "砲", color: "black" },
  "0,3": { text: "卒", color: "black" },
  "2,3": { text: "卒", color: "black" },
  "4,3": { text: "卒", color: "black" },
  "6,3": { text: "卒", color: "black" },
  "8,3": { text: "卒", color: "black" },

  // 红方布局
  "0,9": { text: "俥", color: "red" },
  "1,9": { text: "傌", color: "red" },
  "2,9": { text: "相", color: "red" },
  "3,9": { text: "仕", color: "red" },
  "4,9": { text: "帥", color: "red" },
  "5,9": { text: "仕", color: "red" },
  "6,9": { text: "相", color: "red" },
  "7,9": { text: "傌", color: "red" },
  "8,9": { text: "俥", color: "red" },
  "1,7": { text: "炮", color: "red" },
  "7,7": { text: "炮", color: "red" },
  "0,6": { text: "兵", color: "red" },
  "2,6": { text: "兵", color: "red" },
  "4,6": { text: "兵", color: "red" },
  "6,6": { text: "兵", color: "red" },
  "8,6": { text: "兵", color: "red" }
};

// 创建棋盘
function createBoard() {
  // 设置动画层级
  document.querySelectorAll('.character-animation').forEach(el => el.style.zIndex = 4);

  // 清空棋盘
  board.innerHTML = '';

  // 创建网格线
  createGridLines();

  // 生成棋盘单元格
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.style.left = `${30 + x * 60 - 30}px`;
      cell.style.top = `${30 + y * 60 - 30}px`;
      cell.dataset.x = x;
      cell.dataset.y = y;

      // 添加棋子
      const pieceKey = `${x},${y}`;
      if (initialPieces[pieceKey]) {
        const piece = document.createElement('div');
        piece.className = `piece ${initialPieces[pieceKey].color}`;
        piece.textContent = initialPieces[pieceKey].text;
        piece.dataset.type = initialPieces[pieceKey].text;
        cell.appendChild(piece);
      }

      // 点击事件处理
      cell.addEventListener('click', function(e) {
        if (!timer) return; // 如果计时器未启动，禁止点击

        const clickedCell = e.currentTarget;
        const clickedPiece = clickedCell.querySelector('.piece');

        // 选择逻辑
        if (clickedPiece) {
          if (!clickedPiece.classList.contains(currentPlayer)) {
            if (!selectedPiece) return;
          }
        }

        // 清除选择状态
        document.querySelectorAll('.piece.selected').forEach(p => p.classList.remove('selected'));

        if (selectedPiece) {
          // 移动验证流程
          const fromX = parseInt(selectedCell.dataset.x);
          const fromY = parseInt(selectedCell.dataset.y);
          const toX = parseInt(clickedCell.dataset.x);
          const toY = parseInt(clickedCell.dataset.y);
          const targetPiece = clickedCell.querySelector('.piece');
          const pieceType = selectedPiece.dataset.type;

          // 检查是否攻击己方
          if (targetPiece && targetPiece.classList.contains(selectedPiece.classList.contains('red') ? 'red' : 'black')) {
            alert("不能吃自己的棋子！");
            selectedPiece.classList.remove('selected');
            selectedPiece = null;
            selectedCell = null;
            return;
          }

          // 验证移动规则
          const validator = moveValidators[pieceType];
          if (!validator(fromX, fromY, toX, toY)) {
            clickedCell.classList.add('invalid-move');
            setTimeout(() => clickedCell.classList.remove('invalid-move'), 500);
            return;
          }

          // 执行移动
          const originalParent = selectedPiece.parentElement;
          const backupTarget = targetPiece ? targetPiece.cloneNode(true) : null;
          let capturedPiece = null;

          if (targetPiece && !targetPiece.classList.contains(currentPlayer)) {
            clickedCell.removeChild(targetPiece);
            capturedPiece = targetPiece;
          }
          clickedCell.appendChild(selectedPiece);

          // 检查将帅照面
          if (checkGeneralFaceOff()) {
            alert("將帅不能直接照面！");
            clickedCell.removeChild(selectedPiece);
            originalParent.appendChild(selectedPiece);
            if (backupTarget) clickedCell.appendChild(backupTarget);
            return;
          }

          // 记录移动历史
          moveHistory.push({
            from: { x: fromX, y: fromY },
            to: { x: toX, y: toY },
            movedPiece: selectedPiece,
            capturedPiece: capturedPiece
          });

          // 切换玩家
          currentPlayer = currentPlayer === 'red' ? 'black' : 'red';
          playerDisplay.textContent = currentPlayer === 'red' ? '红方' : '黑方';

          // 切换闪烁动画
          switchBlinkAnimation();

          // 重置选择
          selectedPiece.classList.remove('selected');
          selectedPiece = null;
          selectedCell = null;

          // 重置计时器
          clearInterval(timer);
          remainingTime = 30;
          timerDisplay.textContent = remainingTime;
          startTimer();

          // 检查胜利条件
          const kings = document.querySelectorAll('[data-type="將"], [data-type="帥"]');
          if (kings.length < 2) {
            const winner = kings[0].classList.contains('red') ? '红方' : '黑方';
            setTimeout(() => {
              alert(`${winner}胜利！`);
              restartGame();
            }, 100);
          }
        } else if (clickedPiece && clickedPiece.classList.contains(currentPlayer)) {
          // 选择己方棋子
          selectedPiece = clickedPiece;
          selectedCell = clickedCell;
          clickedPiece.classList.add('selected');
        }
      });

      board.appendChild(cell);
    }
  }

  // 设置层级关系
  document.querySelectorAll('.grid-line').forEach(el => el.style.zIndex = 2);
  document.querySelectorAll('.cell').forEach(el => el.style.zIndex = 3);
  document.querySelectorAll('.piece').forEach(el => el.style.zIndex = 3);

  // 初始闪烁动画
  switchBlinkAnimation();
}

// 切换闪烁动画
function switchBlinkAnimation() {
  document.querySelectorAll('.piece').forEach(piece => {
    piece.classList.remove('blink-animation');
  });
  const currentPlayerPieces = document.querySelectorAll(`.piece.${currentPlayer}`);
  currentPlayerPieces.forEach(piece => {
    piece.classList.add('blink-animation');
  });
}

// 重新开始游戏
function restartGame() {
  selectedPiece = null;
  selectedCell = null;
  moveHistory = [];
  currentPlayer = 'red';
  playerDisplay.textContent = '红方';
  // 重置计时器
  clearInterval(timer);
  remainingTime = 30;
  timerDisplay.textContent = remainingTime;
  startGameBtn.disabled = false;
  createBoard();
}

// 悔棋功能
function undoMove() {
  if (moveHistory.length === 0) return;
  const lastMove = moveHistory.pop();
  const fromCell = document.querySelector(`[data-x="${lastMove.from.x}"][data-y="${lastMove.from.y}"]`);
  const toCell = document.querySelector(`[data-x="${lastMove.to.x}"][data-y="${lastMove.to.y}"]`);

  fromCell.appendChild(lastMove.movedPiece);
  if (lastMove.capturedPiece) toCell.appendChild(lastMove.capturedPiece);
  
  currentPlayer = currentPlayer === 'red' ? 'black' : 'red';
  playerDisplay.textContent = currentPlayer === 'red' ? '红方' : '黑方';

  // 切换闪烁动画
  switchBlinkAnimation();

  // 重置计时器
  clearInterval(timer);
  remainingTime = 30;
  timerDisplay.textContent = remainingTime;
  startTimer();
}

// 教程功能
function showTutorial() {
  document.getElementById('tutorial-modal').style.display = 'block';
  // 隐藏视频容器
  videoContainer.style.display = 'none';
}
function closeTutorial() {
  document.getElementById('tutorial-modal').style.display = 'none';
  // 暂停视频
  tutorialVideo.pause();
  playPauseBtn.textContent = '播放';
}

function openTab(evt, tabName) {
  const tabcontent = document.getElementsByClassName("tabcontent");
  const tablinks = document.getElementsByClassName("tablinks");
  
  for (let i = 0; i < tabcontent.length; i++) tabcontent[i].style.display = "none";
  for (let i = 0; i < tablinks.length; i++) tablinks[i].className = tablinks[i].className.replace(" active", "");
  
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}

// 启动计时器
function startTimer() {
  timer = setInterval(() => {
    remainingTime--;
    timerDisplay.textContent = remainingTime;
    if (remainingTime === 0) {
      clearInterval(timer);
      const loser = currentPlayer;
      const winner = loser === 'red' ? '黑方' : '红方';
      alert(`${loser}超时，${winner}胜利！`);
      restartGame();
    }
  }, 1000);
}

// 切换音乐播放状态
function toggleMusic() {
  if (music.paused) {
    music.play();
    musicBtn.textContent = '暂停音乐';
  } else {
    music.pause();
    musicBtn.textContent = '播放音乐';
  }
}

// 开始游戏函数
function startGame() {
  startGameBtn.disabled = true;
  createBoard();
  document.querySelector('.tablinks').click();
  startTimer();
  // 确保音乐在页面加载时播放
  music.play().catch(e => {
    console.log("自动播放被阻止:", e);
    // 可以在这里提示用户点击按钮开始音乐
    musicBtn.textContent = '点击播放音乐';
  });
}

// 打开视频容器
function openVideo() {
  const tabcontent = document.getElementsByClassName("tabcontent");
  for (let i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  const tablinks = document.getElementsByClassName("tablinks");
  for (let i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  videoContainer.style.display = 'block';
  document.querySelector('[onclick="openVideo()"]').className += " active";
}

// 播放/暂停视频
function toggleVideo() {
  if (tutorialVideo.paused) {
    tutorialVideo.play();
    playPauseBtn.textContent = '暂停';
  } else {
    tutorialVideo.pause();
    playPauseBtn.textContent = '播放';
  }
}

// 初始化页面时不自动开始游戏
window.onload = function() {
  createBoard();
  document.querySelector('.tablinks').click();
  startGameBtn.disabled = false;
  remainingTime = 30;
  timerDisplay.textContent = remainingTime;
};