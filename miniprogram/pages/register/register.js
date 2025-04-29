Page({
  data: {
    username: '',
    nickname: '',
    password: '',
    confirmPassword: '',
    loading: false
  },

  onUsernameInput(e) {
    this.setData({
      username: e.detail.value.trim()
    });
  },

  onNicknameInput(e) {
    this.setData({
      nickname: e.detail.value.trim()
    });
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  onConfirmPasswordInput(e) {
    this.setData({
      confirmPassword: e.detail.value
    });
  },

  validateInput() {
    const { username, password, confirmPassword } = this.data;
    
    if (!username) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      });
      return false;
    }

    if (username.length < 3) {
      wx.showToast({
        title: '用户名至少3个字符',
        icon: 'none'
      });
      return false;
    }

    if (!password) {
      wx.showToast({
        title: '请输入密码',
        icon: 'none'
      });
      return false;
    }

    if (password.length < 6) {
      wx.showToast({
        title: '密码长度至少6位',
        icon: 'none'
      });
      return false;
    }

    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次输入的密码不一致',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  async onRegister() {
    if (!this.validateInput()) return;

    const { username, password, nickname } = this.data;
    
    this.setData({ loading: true });
    
    try {
      const res = await wx.cloud.callFunction({
        name: 'register',
        data: { username, password, nickname }
      });
      
      if (res.result.success) {
        wx.showToast({
          title: '注册成功',
          icon: 'success',
          duration: 2000,
          success: () => {
            setTimeout(() => {
              wx.navigateBack();
            }, 2000);
          }
        });
      } else {
        wx.showToast({
          title: res.result.error || '注册失败',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('注册失败:', error);
      wx.showToast({
        title: '注册失败，请稍后重试',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goToLogin() {
    wx.navigateBack();
  }
}); 