Component({
  properties: {
    // 帧图片数组
    frames: {
      type: Array,
      value: []
    },
    // 每帧持续时间（毫秒）
    frameInterval: {
      type: Number,
      value: 200
    },
    // 是否自动播放
    autoplay: {
      type: Boolean,
      value: true
    },
    // 是否循环播放
    loop: {
      type: Boolean,
      value: true
    },
    // 宽度
    width: {
      type: String,
      value: '100%'
    },
    // 高度
    height: {
      type: String,
      value: '200px'
    }
  },

  data: {
    currentFrameIndex: 0,
    isPlaying: false,
    animationTimer: null
  },

  lifetimes: {
    attached() {
      if (this.properties.autoplay) {
        this.play();
      }
    },
    detached() {
      this.pause();
    }
  },

  methods: {
    play() {
      if (this.data.isPlaying) return;
      
      if (this.properties.frames.length === 0) {
        console.warn('没有帧可播放');
        return;
      }

      this.setData({ isPlaying: true });
      this.startAnimation();
    },

    pause() {
      if (this.data.animationTimer) {
        clearTimeout(this.data.animationTimer);
        this.setData({ 
          animationTimer: null,
          isPlaying: false
        });
      }
    },

    reset() {
      this.pause();
      this.setData({ currentFrameIndex: 0 });
    },

    togglePlay() {
      if (this.data.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    },

    onImageTap() {
      // 点击图片时可以执行特定操作，例如全屏显示
      this.triggerEvent('frameTap', { 
        index: this.data.currentFrameIndex,
        url: this.properties.frames[this.data.currentFrameIndex] 
      });
    },

    startAnimation() {
      // 清除之前的定时器
      if (this.data.animationTimer) {
        clearTimeout(this.data.animationTimer);
      }

      // 设置新的定时器
      const timer = setTimeout(() => {
        let nextIndex = this.data.currentFrameIndex + 1;
        
        // 循环逻辑
        if (nextIndex >= this.properties.frames.length) {
          if (this.properties.loop) {
            nextIndex = 0;
          } else {
            this.pause();
            this.triggerEvent('animationEnd');
            return;
          }
        }

        this.setData({ currentFrameIndex: nextIndex });
        
        // 如果仍在播放，继续下一帧
        if (this.data.isPlaying) {
          this.startAnimation();
        }
      }, this.properties.frameInterval);

      this.setData({ animationTimer: timer });
    }
  }
}) 