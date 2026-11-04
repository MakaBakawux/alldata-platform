<template>
  <div class="ocr-container">
    <div class="page-header">
      <div>
        <h2>DeepSeek 智能 OCR 识别与数据飞轮</h2>
        <div class="page-subtitle">图片解析、数据清洗和结构化入库工作台</div>
      </div>
      <div class="user-info">
        <i class="el-icon-user"></i>
        <span>{{ currentUserName }}</span>
        <span v-if="currentUserDept" class="user-dept">{{ currentUserDept }}</span>
      </div>
    </div>

    <div v-if="!imageUrl" class="upload-section">
      <el-upload
        class="upload-demo"
        drag
        action="#"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="handleFileChange"
        accept="image/png, image/jpeg, image/jpg"
      >
        <i class="el-icon-upload"></i>
        <div class="el-upload__text">将图片拖到此处，或<em>点击选择</em></div>
        <div class="el-upload__tip" slot="tip">请选择要识别的图片，之后可在图片上框选区域</div>
      </el-upload>
    </div>

    <div v-if="imageUrl" class="workspace">
      <div class="toolbar">
        <el-radio-group v-model="workMode" size="small" style="margin-right: 15px;">
          <el-radio-button label="ocr">🔍 常规 OCR 识别</el-radio-button>
          <el-radio-button label="feedback">🎯 错误打标纠错</el-radio-button>
        </el-radio-group>

        <el-select v-model="projectId" size="small" placeholder="请选择项目" style="width: 130px; margin-right: 10px;">
          <el-option label="项目2 (和燕路)" :value="2"></el-option>
          <el-option label="项目7 (珠海项目)" :value="7"></el-option>
        </el-select>

        <el-button v-if="workMode === 'ocr'" type="primary" size="small" @click="recognizeOcr" :loading="loading">
          <i class="el-icon-search"></i> 1. 开始解析
        </el-button>
        <el-button v-if="workMode === 'ocr' && namedHtmlDict" type="warning" size="small" @click="cleanOcr" :loading="cleaning">
          <i class="el-icon-magic-stick"></i> 2. 开始清洗
        </el-button>
        <el-button v-if="workMode === 'ocr' && ocrResult" type="success" size="small" @click="confirmDataImport" :loading="importing">
          <i class="el-icon-upload2"></i> 3. 确认入库
        </el-button>

        <el-button size="small" @click="clearBoxes">清空选框</el-button>
        <el-button size="small" @click="resetImage">重新上传</el-button>
      </div>

      <div class="tip-text" style="margin-bottom: 15px; font-size: 13px;" :class="workMode === 'ocr' ? 'text-primary' : 'text-danger'">
        <span v-if="workMode === 'ocr'">💡 提示：当前为【识别模式】。点击上方按钮开始识别，识别出的 HTML 会实时渲染在右侧栏。</span>
        <span v-else>🛠️ 提示：当前为【纠错模式】。对照右侧渲染出的 HTML 内容寻找错别字，在左图框选错误区域，一键提交至错题本！</span>
      </div>

      <div class="split-layout">

        <div class="panel-left">
          <div class="panel-header">📸 原始地质图纸画板</div>
          <div
            class="canvas-container"
            ref="canvasContainer"
            @mousedown="startDraw"
            @mousemove="drawing"
            @mouseup="endDraw"
            :class="{'crosshair-danger': workMode === 'feedback'}"
          >
            <img :src="imageUrl" ref="sourceImg" @load="onImageLoad" draggable="false" />

            <div
              v-for="(box, index) in boxes"
              :key="index"
              class="draw-box"
              :style="{ left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' }"
            >
              <span class="box-label">{{ box.name }}</span>
              <i class="el-icon-close delete-btn" @click.stop="removeBox(index)"></i>
            </div>

            <div
              v-if="isDrawing"
              class="draw-box current-box"
              :class="{'feedback-box': workMode === 'feedback'}"
              :style="{ left: currentBox.x + 'px', top: currentBox.y + 'px', width: currentBox.w + 'px', height: currentBox.h + 'px' }"
            ></div>
          </div>
        </div>

        <div class="panel-right">
          <div class="panel-header">📄 大模型 OCR 实时渲染结果 (用于比对纠错)</div>
          <div class="html-renderer-container">
            <div v-if="loading" class="inner-loading">
              <i class="el-icon-loading"></i> 正在全力解析图纸中...
            </div>
            <div v-else-if="rawOcrHtml" v-html="rawOcrHtml" class="rendered-html-content"></div>
            <div v-else class="empty-render-placeholder">
              <i class="el-icon-document" style="font-size: 40px; color: #c0c4cc; display:block; margin-bottom:10px;"></i>
              暂无识别数据。请先在【常规 OCR 识别】模式下点击上方按钮运行一次。
            </div>
          </div>
        </div>

      </div>
    </div>

    <el-dialog title="为 OCR 选区打标签" :visible.sync="dialogVisible" width="400px" :close-on-click-modal="false">
      <el-select v-model="currentBoxName" placeholder="请选择该区域的类型" style="width: 100%;">
        <el-option v-for="item in boxNameOptions" :key="item" :label="item" :value="item"></el-option>
      </el-select>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="confirmBoxName">确 定</el-button>
      </span>
    </el-dialog>

    <el-dialog title="人工纠错 (添加到微调数据集)" :visible.sync="feedbackDialogVisible" width="500px" :close-on-click-modal="false">
      <div style="margin-bottom: 10px; color: #606266; font-size: 14px;">
        请在此处输入刚才框选区域**正确的** Markdown 文本或表格：
      </div>
      <el-input
        type="textarea"
        :autosize="{ minRows: 4, maxRows: 10 }"
        placeholder="例如：| 地层 | 厚度 |\n| -- | -- |"
        v-model="correctText">
      </el-input>
      <span slot="footer" class="dialog-footer">
        <el-button @click="feedbackDialogVisible = false">取 消</el-button>
        <el-button type="danger" @click="submitFeedbackBox" :loading="isSubmittingFeedback">提交至错题本</el-button>
      </span>
    </el-dialog>

    <div v-if="ocrResult && !loading" class="result-section">
      <h3>⚙️ 本地数据清洗引擎分析报告 (JSON):</h3>
      <el-input
        type="textarea"
        :autosize="{ minRows: 5, maxRows: 15 }"
        v-model="ocrResult"
        readonly
      >
      </el-input>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import { recognize, submitFeedback } from '@/api/ocr'
import { cleanData, confirmImport } from '@/api/engineering'

export default {
  name: 'OcrIndex',
  data() {
    return {
      selectedFile: null,
      imageUrl: '',
      loading: false,
      cleaning: false,
      importing: false,
      ocrResult: '',
      namedHtmlDict: null,
      importTaskId: null,
      rawOcrHtml: '', // 🌟 新增：专门用来存放大模型吐出来的 HTML 原始文本

      projectId: 2,
      workMode: 'ocr',

      isDrawing: false,
      startX: 0,
      startY: 0,
      currentBox: { x: 0, y: 0, w: 0, h: 0 },
      boxes: [],
      tempBox: null,
      imgScaleX: 1,
      imgScaleY: 1,

      dialogVisible: false,
      currentBoxName: '',
      boxNameOptions: ['上输出', '左输出', '基本承载力输出', '试件编号输出', '标贯击数输出', '其他'],

      feedbackDialogVisible: false,
      correctText: '',
      isSubmittingFeedback: false
    };
  },
  computed: {
    ...mapGetters(['user']),
    currentUserName() {
      return (this.user && (this.user.nickName || this.user.username || this.user.name)) || '当前用户'
    },
    currentUserDept() {
      return this.user && this.user.dept && this.user.dept.name
    }
  },
  beforeDestroy() {
    document.removeEventListener('mousemove', this.drawing);
    document.removeEventListener('mouseup', this.endDraw);
  },
  methods: {
    handleFileChange(file) {
      if (file.raw) {
        this.selectedFile = file.raw;
        this.imageUrl = URL.createObjectURL(file.raw);
        this.boxes = [];
        this.ocrResult = '';
        this.namedHtmlDict = null;
        this.importTaskId = null;
        this.rawOcrHtml = ''; // 切换图片时清空
      }
    },
    resetImage() {
      this.selectedFile = null;
      this.imageUrl = '';
      this.boxes = [];
      this.ocrResult = '';
      this.namedHtmlDict = null;
      this.importTaskId = null;
      this.rawOcrHtml = '';
      this.workMode = 'ocr';
    },
    clearBoxes() { this.boxes = []; },
    removeBox(index) { this.boxes.splice(index, 1); },
    onImageLoad() {
      const imgInfo = this.$refs.sourceImg;
      this.imgScaleX = imgInfo.naturalWidth / imgInfo.clientWidth;
      this.imgScaleY = imgInfo.naturalHeight / imgInfo.clientHeight;
    },

    startDraw(e) {
      this.isDrawing = true;
      const rect = this.$refs.canvasContainer.getBoundingClientRect();
      const maxX = rect.width;
      const maxY = rect.height;
      this.startX = Math.max(0, Math.min(e.clientX - rect.left, maxX));
      this.startY = Math.max(0, Math.min(e.clientY - rect.top, maxY));
      this.currentBox = { x: this.startX, y: this.startY, w: 0, h: 0 };
      document.addEventListener('mousemove', this.drawing);
      document.addEventListener('mouseup', this.endDraw);
    },
    drawing(e) {
      if (!this.isDrawing) return;
      const rect = this.$refs.canvasContainer.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

      this.currentBox.x = Math.min(this.startX, currentX);
      this.currentBox.y = Math.min(this.startY, currentY);
      this.currentBox.w = Math.abs(currentX - this.startX);
      this.currentBox.h = Math.abs(currentY - this.startY);
    },
    endDraw() {
      if (!this.isDrawing) return;
      document.removeEventListener('mousemove', this.drawing);
      document.removeEventListener('mouseup', this.endDraw);
      this.isDrawing = false;

      if (this.currentBox.w > 10 && this.currentBox.h > 10) {
        this.tempBox = { ...this.currentBox };

        if (this.workMode === 'ocr') {
          this.currentBoxName = '';
          this.dialogVisible = true;
        } else if (this.workMode === 'feedback') {
          this.correctText = '';
          this.feedbackDialogVisible = true;
        }
      }
    },

    confirmBoxName() {
      if (!this.currentBoxName) {
        this.$message.warning('请为该区域选择一个类型');
        return;
      }
      this.boxes.push({ ...this.tempBox, name: this.currentBoxName });
      this.dialogVisible = false;
    },

    // --- 人工纠错模式提交 ---
    async submitFeedbackBox() {
      if (!this.correctText.trim()) {
        this.$message.warning('正确文本不能为空');
        return;
      }
      this.isSubmittingFeedback = true;

      const realBox = {
        x: Math.round(this.tempBox.x * this.imgScaleX),
        y: Math.round(this.tempBox.y * this.imgScaleY),
        w: Math.round(this.tempBox.w * this.imgScaleX),
        h: Math.round(this.tempBox.h * this.imgScaleY)
      };

      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('box_json', JSON.stringify(realBox));
      formData.append('correct_text', this.correctText);

      try {
        const response = await submitFeedback(formData);
        this.$message.success(response.data.msg || '纠错数据提交成功！');
        this.feedbackDialogVisible = false;
        this.tempBox = null;
      } catch (error) {
        console.error('Feedback API Error:', error);
        let errorMsg = '提交失败';
        if (error.response && error.response.status === 503) {
          errorMsg = '模型正在后台闭关微调升级中，暂不接受新数据！';
        } else if (error.response && error.response.data && error.response.data.detail) {
          errorMsg = error.response.data.detail;
        }
        this.$message.error('纠错失败：' + errorMsg);
      } finally {
        this.isSubmittingFeedback = false;
      }
    },

    // --- 第一步：OCR 解析 ---
    async recognizeOcr() {
      if (!this.selectedFile) return;

      this.loading = true;
      this.ocrResult = '';
      this.namedHtmlDict = null;
      this.importTaskId = null;
      this.rawOcrHtml = '';

      const formData = new FormData();
      formData.append('file', this.selectedFile);
      formData.append('project_id', this.projectId);
      const realBoxes = this.boxes.map(box => ({
        x: Math.round(box.x * this.imgScaleX),
        y: Math.round(box.y * this.imgScaleY),
        w: Math.round(box.w * this.imgScaleX),
        h: Math.round(box.h * this.imgScaleY),
        name: box.name
      }));
      if (realBoxes.length > 0) formData.append('boxes_json', JSON.stringify(realBoxes));

      try {
        const response = await recognize(formData);
        const result = response.data || response;
        if (result.status !== 'success' || !result.data || !result.data.named_html_dict) {
          throw new Error('未获取到有效的识别数据');
        }
        this.namedHtmlDict = result.data.named_html_dict;
        let htmlBuilder = '';
        for (const [partName, htmlContent] of Object.entries(this.namedHtmlDict)) {
          htmlBuilder += `
            <div class="html-block-card">
              <div class="block-badge">${partName}</div>
              <div class="block-body">${htmlContent}</div>
            </div>`;
        }
        this.rawOcrHtml = htmlBuilder;
        this.$message.success('云端 OCR 解析成功，请继续点击“开始清洗”。');
      } catch (error) {
        this.handleApiError(error, '解析失败');
      } finally {
        this.loading = false;
      }
    },

    // --- 第二步：数据清洗 ---
    async cleanOcr() {
      if (!this.namedHtmlDict) return;
      this.cleaning = true;
      try {
        const response = await cleanData({
          project_id: this.projectId,
          named_html_dict: this.namedHtmlDict
        });
        const result = response.data || response;
        this.ocrResult = JSON.stringify(result, null, 2);
        this.importTaskId = result.task_id || result.id || null;
        this.$message.success('数据清洗完成，请确认后入库。');
      } catch (error) {
        this.handleApiError(error, '清洗失败');
      } finally {
        this.cleaning = false;
      }
    },

    // --- 第三步：确认入库 ---
    async confirmDataImport() {
      if (!this.ocrResult) return;
      this.importing = true;
      try {
        const response = await confirmImport({
          project_id: this.projectId,
          task_id: this.importTaskId,
          named_html_dict: this.namedHtmlDict,
          clean_result: JSON.parse(this.ocrResult)
        });
        const result = response.data || response;
        this.$message.success(result.message || '数据已确认入库。');
      } catch (error) {
        this.handleApiError(error, '入库失败');
      } finally {
        this.importing = false;
      }
    },

    handleApiError(error, prefix) {
      console.error(prefix, error);
      let errorMsg = '请检查网络或服务状态';
      if (error.response && error.response.status === 503) {
        errorMsg = '云端模型正在微调升级，暂时无法处理。';
      } else if (error.response && error.response.data && error.response.data.detail) {
        errorMsg = error.response.data.detail;
      } else if ((error.message || '').includes('Network Error')) {
        errorMsg = '网络连接失败，请检查本地隧道及 8088/8089 服务。';
      }
      this.$message.error(prefix + '：' + errorMsg);
    }
  }
};
</script>

<style scoped>
.ocr-container { padding: 20px; max-width: 1400px; margin: 0 auto; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.page-header h2 { margin: 0 0 6px; }
.page-subtitle { color: #909399; font-size: 13px; }
.user-info { display: flex; align-items: center; gap: 8px; color: #606266; font-size: 14px; }
.user-info i { color: #409EFF; font-size: 18px; }
.user-dept { color: #909399; border-left: 1px solid #dcdfe6; padding-left: 8px; }
.upload-section { text-align: center; margin: 40px 0; }
.workspace { margin-top: 20px; background: #fdfdfd; border: 1px solid #ebeef5; padding: 15px; border-radius: 8px; }
.toolbar { margin-bottom: 15px; display: flex; align-items: center; flex-wrap: wrap; }
.text-primary { color: #409EFF; }
.text-danger { color: #F56C6C; font-weight: bold; }

/* 🌟 双栏响应式排版样式 */
.split-layout { display: flex; display: -webkit-flex; gap: 20px; align-items: flex-start; }
.panel-left { flex: 1.2; min-width: 0; background: #fff; border: 1px solid #e4e7ed; border-radius: 6px; padding: 12px; }
.panel-right { flex: 1; min-width: 0; background: #fff; border: 1px solid #e4e7ed; border-radius: 6px; padding: 12px; }
.panel-header { font-size: 14px; font-weight: bold; color: #303133; padding-bottom: 10px; margin-bottom: 12px; border-bottom: 2px solid #e4e7ed; }

/* 画板基础 */
.canvas-container { position: relative; display: inline-block; user-select: none; cursor: crosshair; max-width: 100%; border: 1px dashed #dcdfe6; }
.canvas-container img { max-width: 100%; display: block; }
.crosshair-danger { cursor: crosshair; }

/* 选框 */
.draw-box { position: absolute; border: 2px solid #409EFF; background-color: rgba(64, 158, 255, 0.1); box-sizing: border-box; }
.current-box { border-style: dashed; }
.feedback-box { border: 2px dashed #F56C6C !important; background-color: rgba(245, 108, 108, 0.15) !important; }
.box-label { position: absolute; top: -24px; left: -2px; background: #409EFF; color: white; padding: 2px 8px; font-size: 12px; border-radius: 4px 4px 0 0; white-space: nowrap; }
.delete-btn { position: absolute; top: 0; right: 0; background: rgba(0, 0, 0, 0.5); color: #fff; padding: 2px; cursor: pointer; }
.delete-btn:hover { background: #F56C6C; }

/* 🌟 右侧 HTML 渲染展示核心样式 */
.html-renderer-container { background: #fafafa; border: 1px solid #f2f6fc; border-radius: 4px; padding: 10px; min-height: 450px; max-height: 700px; overflow-y: auto; }
.inner-loading { text-align: center; padding-top: 100px; color: #409EFF; font-size: 15px; }
.empty-render-placeholder { text-align: center; padding-top: 150px; color: #909399; font-size: 13px; line-height: 1.5; }

/* 🌟 HTML 块渲染卡片效果 */
::v-deep .html-block-card { background: #fff; border: 1px solid #ebeef5; border-radius: 6px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); overflow: hidden; }
::v-deep .block-badge { background: #e1f3d8; color: #67c23a; font-size: 12px; font-weight: bold; padding: 4px 10px; display: inline-block; border-bottom-right-radius: 6px; }
::v-deep .block-body { padding: 12px; overflow-x: auto; font-size: 13px; color: #333; }

/* 🌟 核心：强行美化大模型生成的 HTML <table> 表格，防止串行错位 */
::v-deep .block-body table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12px; }
::v-deep .block-body th { background-color: #f5f7fa; color: #909399; font-weight: bold; border: 1px solid #dcdfe6; padding: 6px 8px; text-align: left; }
::v-deep .block-body td { border: 1px solid #e4e7ed; padding: 6px 8px; background-color: #fff; vertical-align: middle; }
::v-deep .block-body tr:hover td { background-color: #f5f7fa; }

.result-section { margin-top: 20px; padding: 15px; background-color: #f4f4f5; border-radius: 6px; }
</style>
