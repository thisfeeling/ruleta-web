import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import { storageService } from '@/modules/core/services/storage.service'

export class ApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000',
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    // Attach auth token if present in localStorage
    this.client.interceptors.request.use(
      (config) => {
        try {
          const token = localStorage.getItem('auth_token')
          if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`
          }
        } catch {
          // ignore
        }
        return config
      },
      (error) => Promise.reject(error),
    )

    // Response error handling with 401 handling (remove token + redirect)
    this.client.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          try {
            localStorage.removeItem('auth_token')
          } catch {}

          // Clear saved session if available
          try {
            storageService.clearPlayerSession()
          } catch {
            // ignore failures — we already attempted a static import
          }

          try {
            if (typeof window !== 'undefined') window.location.href = '/'
          } catch {}
        }
        return Promise.reject(error)
      },
    )
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config)
    return response.data
  }

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config)
    return response.data
  }
}

export const apiService = new ApiService()
