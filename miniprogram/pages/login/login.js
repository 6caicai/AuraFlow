Page({
  data: {
    username: '',
    password: '',
    isLoggedIn: false,
    rememberPassword: false,
    loading: false
  },

  onLoad() {
    // 检查是否已登录
    this.checkLoginStatus();
    // 检查是否有保存的用户名和密码
    const savedUsername = wx.getStorageSync('savedUsername');
    const savedPassword = wx.getStorageSync('savedPassword');
    if (savedUsername && savedPassword) {
      this.setData({
        username: savedUsername,
        password: savedPassword,
        rememberPassword: true
      });
    }
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      // 验证token有效性
      this.validateToken(token);
    }
  },

  validateToken(token) {
    // TODO: 调用后端API验证token
    // 这里暂时模拟验证
    if (token) {
      this.setData({ isLoggedIn: true });
    }
  },

  onUsernameInput(e) {
    this.setData({
      username: e.detail.value.trim()
    });
  },

  onPasswordInput(e) {
    this.setData({
      password: e.detail.value
    });
  },

  onRememberPasswordChange(e) {
    this.setData({
      rememberPassword: e.detail.value
    });
  },

  validateInput() {
    const { username, password } = this.data;
    
    if (!username) {
      wx.showToast({
        title: '请输入用户名',
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

    return true;
  },

  async onLogin() {
    if (!this.validateInput()) return;

    const { username, password, rememberPassword } = this.data;
    
    this.setData({ loading: true });
    
    try {
      // 使用云函数进行登录认证
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: { username, password }
      });
      
      console.log('登录结果:', res);
      
      if (res.result && res.result.success) {
        // 保存登录状态
        const token = res.result.token;
        const userInfo = res.result.userInfo;
        
        wx.setStorageSync('token', token);
        wx.setStorageSync('userInfo', userInfo);
        
        // 如果选择记住密码，保存用户名和密码
        if (rememberPassword) {
          wx.setStorageSync('savedUsername', username);
          wx.setStorageSync('savedPassword', password);
        } else {
          wx.removeStorageSync('savedUsername');
          wx.removeStorageSync('savedPassword');
        }

        this.setData({ 
          isLoggedIn: true,
          loading: false
        });

        wx.showToast({
          title: '登录成功',
          icon: 'success',
          success: () => {
            // 延迟跳转，让用户看到成功提示
            setTimeout(() => {
              // 返回上一页或跳转到首页
              if (getCurrentPages().length > 1) {
                wx.navigateBack();
              } else {
                wx.switchTab({
                  url: '/pages/index/index'
                });
              }
            }, 1500);
          }
        });
      } else {
        wx.showToast({
          title: res.result?.message || '登录失败，用户名或密码错误',
          icon: 'none'
        });
        this.setData({ loading: false });
      }
    } catch (error) {
      console.error('登录失败:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录状态
          wx.removeStorageSync('token');
          this.setData({
            isLoggedIn: false,
            username: '',
            password: ''
          });
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  },

  onRegister() {
    wx.navigateTo({
      url: '/pages/register/register',
    });
  }
}); 