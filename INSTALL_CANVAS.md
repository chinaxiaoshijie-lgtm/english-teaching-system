# 安装 Canvas 包

为了支持PDF幻灯片处理功能，需要安装 `canvas` 包。

## 安装步骤

### Windows

1. 确保已安装以下构建工具：
   - Visual Studio Build Tools
   - Python 2.7 或更高版本

2. 运行以下命令：
   ```
   npm install canvas
   ```

### macOS

1. 确保已安装 Xcode Command Line Tools：
   ```
   xcode-select --install
   ```

2. 运行以下命令：
   ```
   npm install canvas
   ```

### Linux (Ubuntu/Debian)

1. 安装依赖：
   ```
   sudo apt-get update
   sudo apt-get install build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
   ```

2. 运行以下命令：
   ```
   npm install canvas
   ```

## 验证安装

安装完成后，可以运行以下命令验证：
```bash
node -e "console.log(require('canvas'))"
```

如果未报错，则安装成功。

## 使用说明

安装完成后，上传PDF课件时会自动处理PDF并生成幻灯片图片。生成的幻灯片将存储在 `uploads/lessons/{lessonId}/slides/` 目录下。

## 故障排除

### 安装失败

如果安装 `canvas` 包失败，可以尝试以下方法：

1. **使用预编译的二进制文件**：
   ```
   npm install canvas --build-from-source=false
   ```

2. **使用镜像源**：
   ```
   npm install canvas --registry=https://registry.npmmirror.com
   ```

3. **清除缓存后重试**：
   ```
   npm cache clean --force
   npm install canvas
   ```

### PDF处理不工作

如果PDF处理功能不工作，请检查：

1. `canvas` 包是否正确安装
2. 检查服务器日志中的错误信息
3. 确保上传的是PDF文件（.pdf扩展名）
4. 确保有足够的磁盘空间存储生成的幻灯片
