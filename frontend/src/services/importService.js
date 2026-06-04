import api from './api'

export const importCSV = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const response = await api.post('/import/csv', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

export const downloadSampleCSV = async () => {
  const response = await api.get('/import/sample', {
    responseType: 'blob',
  })
  const url = window.URL.createObjectURL(new Blob([response.data]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', 'sample-inventory-import.csv')
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
