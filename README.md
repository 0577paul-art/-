# 嘉鸿花园网球场预约系统 - 阿里云部署指南

这是一个基于 React + Express + Node.js 的全栈 H5 应用，专门为微信环境优化。

## 1. 环境准备
*   **Node.js**: v18+
*   **npm**: 随 Node.js 安装
*   **域名**: 已备案的域名（微信访问必需）
*   **SSL 证书**: HTTPS 证书（微信访问必需）

## 2. 部署步骤

### 第一步：上传代码
将本项目的所有文件上传到您的阿里云服务器目录（例如 `/var/www/tennis-app`）。

### 第二步：安装依赖
在项目根目录下运行：
```bash
npm install
```

### 第三步：配置环境变量
创建 `.env` 文件（或在阿里云后台配置环境变量）：
```env
ADMIN_PASSWORD=您的管理员密码
NODE_ENV=production
```

### 第四步：构建前端
运行以下命令生成生产环境的静态文件：
```bash
npm run build
```

### 第五步：启动服务器
推荐使用 `pm2` 进行进程管理：
```bash
# 安装 pm2
npm install pm2 -g

# 启动应用
pm2 start npx --name "tennis-app" -- tsx server.ts
```

### 第六步：配置 Nginx (HTTPS)
在 Nginx 配置文件中添加反向代理，将请求转发到 3000 端口：
```nginx
server {
    listen 443 ssl;
    server_name 您的域名;

    ssl_certificate /path/to/your/cert.pem;
    ssl_certificate_key /path/to/your/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 3. 管理员初始信息
*   **地址**: `https://您的域名/` 点击底部的“管理员入口”
*   **用户名**: `admin`
*   **密码**: 您在 .env 中设置的密码（默认为 `jiahong888`）

## 4. 路径说明
该版本已配置为**相对路径**（Relative Paths）：
*   前端资源引用均使用 `./assets/`。
*   API 调用均使用相对当前路径的 `api/`。
这确保了即使您将应用部署在域名的子目录下（例如 `https://yourdomain.com/tennis/`），它也能正常工作。

## 5. 数据备份
所有预约数据和白名单都保存在根目录下的 `data.json` 文件中。建议定期备份此文件。
