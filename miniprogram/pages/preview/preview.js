Page({
  data: {
    videoUrl: ''
  },

  onLoad: function(options) {
    if (options.videoUrl) {
      this.setData({
        videoUrl: options.videoUrl
      });
    }
  },

  onPlay: function() {
    console.log('视频开始播放');
  },

  onPause: function() {
    console.log('视频暂停播放');
  },

  onEnded: function() {
    console.log('视频播放结束');
  },

  saveVideo: function() {
    wx.showLoading({
      title: '保存中...',
    });

    wx.downloadFile({
      url: this.data.videoUrl,
      success: (res) => {
        wx.saveVideoToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading();
            wx.showToast({
              title: '保存成功',
              icon: 'success'
            });
          },
          fail: (err) => {
            wx.hideLoading();
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            });
            console.error(err);
          }
        });
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
        console.error(err);
      }
    });
  },

  onShareAppMessage: function() {
    return {
      title: '看看我制作的动态图片效果',
      path: '/pages/index/index'
    };
  }
}); 