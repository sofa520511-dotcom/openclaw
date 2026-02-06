# n8n + AnythingLLM 自動化架構部署指南

這是一個整合 **n8n** (工作流自動化) 與 **AnythingLLM** (RAG 知識庫) 的 Docker Compose 部署方案。

## 📂 目錄結構
- `docker-compose.yml`: 核心啟動檔
- `n8n_data/`: 存放 n8n 的工作流與設定
- `anythingllm_storage/`: 存放 AnythingLLM 的向量資料庫與文件

## 🚀 快速啟動

1. **下載專案**
   ```bash
   git clone https://github.com/sofa520511-dotcom/openclaw.git
   cd openclaw/n8n-anythingllm
   ```

2. **啟動服務**
   ```bash
   docker-compose up -d
   ```

3. **訪問服務**
   - **n8n**: `http://localhost:5678`
     - 預設帳號: `admin`
     - 預設密碼: `password` (請在 docker-compose.yml 修改)
   - **AnythingLLM**: `http://localhost:3001`

## 🔗 串接邏輯 (How to Connect)

### 1. AnythingLLM 設定
- 進入 `http://localhost:3001` 完成初始化。
- 建立一個 Workspace (例如 "MyKnowledge")。
- 在設定中取得 **API Key**。

### 2. n8n 設定
- 在 n8n 中新增 **HTTP Request** 節點。
- Method: `POST`
- URL: `http://anythingllm:3001/api/v1/openai/chat` (利用 Docker 內部網路互連)
- Headers: `Authorization: Bearer <YOUR_API_KEY>`
- Body: 傳送您的 Prompt。

## 💡 進階用法
- 您可以在 n8n 接收 LINE/Email 訊息。
- 丟給 AnythingLLM 查詢公司內部文件。
- 將 AnythingLLM 回傳的答案，透過 n8n 自動回覆給使用者。
