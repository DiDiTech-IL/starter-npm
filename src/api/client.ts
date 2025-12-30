import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { getAuthToken } from '../utils/auth.js';
import { API_BASE_URL } from '../constants.js';
import { FetchTemplateResponse, InstallationReport, CacheInfo } from './types.js';
import { logInfo, logWarning } from '../utils/logger.js';

export interface FetchOptions {
  forceRefresh?: boolean;
  version?: string;
}

export class TachlesAPIClient {
  private client: AxiosInstance;
  private baseURL: string;
  private verbose: boolean;

  constructor(baseURL?: string, verbose = false) {
    this.baseURL = baseURL || API_BASE_URL;
    this.verbose = verbose;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '@tachles/starter-cli/1.0.0',
      },
    });

    // Add auth interceptor
    this.client.interceptors.request.use((config) => {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for cache logging
    this.client.interceptors.response.use(
      (response) => {
        if (this.verbose) {
          this.logCacheInfo(response);
        }
        return response;
      },
      (error) => {
        if (this.verbose && error.response) {
          this.logCacheInfo(error.response);
        }
        throw error;
      }
    );
  }

  private logCacheInfo(response: AxiosResponse) {
    const cacheStatus = response.headers['x-cache-status'];
    const cacheSource = response.headers['x-cache-source'];
    const cacheKey = response.headers['x-cache-key'];
    const cacheAge = response.headers['x-cache-age'];

    if (cacheStatus) {
      const statusColor = cacheStatus === 'HIT' ? '✅' : '⚠️';
      logInfo(`${statusColor} Cache: ${cacheStatus} from ${cacheSource || 'unknown'}`);
      
      if (cacheKey) {
        logInfo(`   Key: ${cacheKey}`);
      }
      if (cacheAge) {
        logInfo(`   Age: ${cacheAge}s`);
      }
    }
  }

  async fetchTemplate(
    templateId: string,
    options: FetchOptions = {}
  ): Promise<FetchTemplateResponse & { cacheInfo?: CacheInfo }> {
    const params: Record<string, string> = {};
    const headers: Record<string, string> = {};

    // Add version parameter if specified
    if (options.version) {
      params.version = options.version;
    }

    // Add cache control headers
    if (options.forceRefresh) {
      headers['Cache-Control'] = 'no-cache';
      headers['X-Force-Refresh'] = 'true';
      if (this.verbose) {
        logWarning('⚡ Forcing cache refresh from database');
      }
    }

    const response = await this.client.get<FetchTemplateResponse>(
      `/api/cli/templates/${templateId}`,
      { params, headers }
    );

    // Extract cache information from response headers
    const cacheInfo: CacheInfo = {
      status: response.headers['x-cache-status'] || 'UNKNOWN',
      source: response.headers['x-cache-source'] || 'unknown',
      key: response.headers['x-cache-key'],
      age: response.headers['x-cache-age'] ? parseInt(response.headers['x-cache-age']) : undefined,
      ttl: response.headers['x-cache-ttl'] ? parseInt(response.headers['x-cache-ttl']) : undefined,
    };

    return {
      ...response.data,
      cacheInfo,
    };
  }

  async reportInstallation(data: InstallationReport) {
    const response = await this.client.post('/api/cli/installations', data);
    return response.data;
  }

  setVerbose(verbose: boolean) {
    this.verbose = verbose;
  }
}
