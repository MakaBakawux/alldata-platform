<template>
  <div class="engineering-page">
    <div class="page-header">
      <div>
        <h2>工程数据工作台</h2>
        <p>统一查询、统计和导出 OCR 清洗后的工程数据</p>
      </div>
      <div class="user-badge"><i class="el-icon-user"></i>{{ currentUserName }}</div>
    </div>

    <el-tabs v-model="activeTab" type="border-card">
      <el-tab-pane label="查询模板" name="query">
        <div class="query-toolbar">
          <el-select v-model="templateId" placeholder="选择查询模板" style="width: 240px">
            <el-option v-for="item in templates" :key="item.id" :label="item.name" :value="item.id" />
          </el-select>
          <el-select v-model="projectId" placeholder="项目" style="width: 180px">
            <el-option label="项目2（和燕路）" :value="2" />
            <el-option label="项目7（珠海项目）" :value="7" />
          </el-select>
          <el-input v-model="keyword" clearable placeholder="关键词（地层、刀具等）" style="width: 220px" />
          <el-button type="primary" :loading="queryLoading" @click="executeQuery">查询</el-button>
          <el-button :disabled="!queryRows.length" @click="exportExcel">导出 Excel</el-button>
          <el-button :disabled="!queryRows.length" @click="exportCsv">导出 CSV</el-button>
        </div>
        <div class="template-hint">
          请选择一个固定查询模板，系统会直接读取已入库的工程数据，不需要编写 SQL。
        </div>
        <el-table v-loading="queryLoading" :data="queryRows" border stripe height="430">
          <el-table-column v-for="column in queryColumns" :key="column" :prop="column" :label="column" min-width="140" show-overflow-tooltip />
          <el-table-column v-if="!queryColumns.length" label="查询结果" min-width="240"><template slot-scope="scope">{{ scope.row }}</template></el-table-column>
        </el-table>
        <div v-if="queryError" class="empty-text">{{ queryError }}</div>
      </el-tab-pane>

      <el-tab-pane label="项目统计" name="statistics">
        <div class="query-toolbar">
          <el-select v-model="projectId" placeholder="选择项目" style="width: 180px"><el-option label="项目2（和燕路）" :value="2" /><el-option label="项目7（珠海项目）" :value="7" /></el-select>
          <el-button type="primary" :loading="statsLoading" @click="loadStatistics">刷新统计</el-button>
        </div>
        <div class="stat-cards">
          <div v-for="card in statCards" :key="card.label" class="stat-card"><span>{{ card.label }}</span><strong>{{ card.value }}</strong></div>
        </div>
        <el-row :gutter="20">
          <el-col :span="12"><div class="chart-panel"><h3>地层统计</h3><el-table :data="stratumStats" border size="small"><el-table-column prop="name" label="地层" /><el-table-column prop="count" label="数量" /></el-table></div></el-col>
          <el-col :span="12"><div class="chart-panel"><h3>刀具统计</h3><el-table :data="toolStats" border size="small"><el-table-column prop="name" label="刀具" /><el-table-column prop="count" label="使用次数" /></el-table></div></el-col>
        </el-row>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'
import XLSX from 'xlsx'
import { queryData, getStatistics } from '@/api/engineering'

export default {
  name: 'EngineeringWorkbench',
  data() {
    return {
      activeTab: 'query',
      projectId: 2,
      templateId: 'stratum-list',
      keyword: '',
      queryRows: [],
      queryColumns: [],
      queryError: '',
      queryLoading: false,
      statsLoading: false,
      statCards: [],
      stratumStats: [],
      toolStats: [],
      templates: [
        { id: 'stratum-list', name: '地层分布查询' },
        { id: 'sample-list', name: '试件信息查询' },
        { id: 'spt-list', name: '标贯记录查询' },
        { id: 'tool-usage', name: '刀具使用查询' }
      ]
    }
  },
  computed: {
    ...mapGetters(['user']),
    currentUserName() {
      return (this.user && (this.user.nickName || this.user.username || this.user.name)) || '当前用户'
    }
  },
  methods: {
    async executeQuery() {
      this.queryLoading = true
      this.queryError = ''
      try {
        const response = await queryData({ template_id: this.templateId, project_id: this.projectId, keyword: this.keyword })
        const result = response.data || response
        this.queryRows = Array.isArray(result) ? result : (result.rows || result.data || [])
        this.queryColumns = this.queryRows.length && typeof this.queryRows[0] === 'object' ? Object.keys(this.queryRows[0]) : []
        this.queryError = result.message || ''
      } catch (error) {
        this.queryRows = []
        this.queryError = '查询服务暂未返回结果，请确认 8089 服务已实现 /api/query 接口。'
      } finally {
        this.queryLoading = false
      }
    },
    async loadStatistics() {
      this.statsLoading = true
      try {
        const response = await getStatistics({ project_id: this.projectId })
        const result = response.data || response
        this.statCards = result.cards || []
        this.stratumStats = result.stratum || result.stratum_stats || []
        this.toolStats = result.tool || result.tool_stats || []
      } catch (error) {
        this.$message.error('统计服务暂不可用，请确认 8089 服务已实现统计接口。')
      } finally {
        this.statsLoading = false
      }
    },
    exportExcel() {
      const sheet = XLSX.utils.json_to_sheet(this.queryRows)
      const book = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(book, sheet, '查询结果')
      XLSX.writeFile(book, '工程数据查询结果.xlsx')
    },
    exportCsv() {
      const sheet = XLSX.utils.json_to_sheet(this.queryRows)
      const csv = XLSX.utils.sheet_to_csv(sheet)
      const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = '工程数据查询结果.csv'
      link.click()
      URL.revokeObjectURL(link.href)
    }
  }
}
</script>

<style scoped>
.engineering-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.page-header h2 { margin: 0 0 6px; }
.page-header p { margin: 0; color: #909399; }
.user-badge { color: #606266; }
.query-toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
.template-hint { margin-bottom: 16px; padding: 12px; color: #606266; background: #f5f7fa; }
.empty-text { padding: 30px; text-align: center; color: #909399; }
.stat-cards { display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card { min-width: 160px; padding: 18px; background: #f5f7fa; border-radius: 6px; }
.stat-card span, .stat-card strong { display: block; }
.stat-card span { color: #909399; font-size: 13px; }
.stat-card strong { margin-top: 8px; color: #303133; font-size: 26px; }
.chart-panel { padding: 16px; border: 1px solid #ebeef5; }
.chart-panel h3 { margin: 0 0 12px; font-size: 15px; }
</style>
