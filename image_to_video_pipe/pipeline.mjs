#!/usr/bin/env node
/**
 * Agnes AI Image → Video Pipeline
 * 
 * Stage 1: Generate image from prompt
 * Stage 2: Animate image to 360° video
 * Stage 3: Poll until video completes
 * 
 * Usage: node pipeline.mjs [--prompt "your prompt"]
 */

import axios from 'axios';
import { writeFileSync, readFileSync } from 'fs';
import { resolve } from 'path';

// ===== CONFIG =====
const API_BASE = 'https://apihub.agnes-ai.com';
const IMAGE_ENDPOINT = '/v1/images/generations';
const VIDEO_ENDPOINT = '/v1/videos';
const STATUS_ENDPOINT = '/agnesapi';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 10000; // 10s flat

// ===== ENV =====
function loadEnv() {
  try {
    const envContent = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    const lines = envContent.split('\n');
    const env: Record<string, string> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
      }
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const API_KEY = env.AGNES_API_KEY || process.env.AGNES_API_KEY || '';

if (!API_KEY) {
  console.error('❌ Error: AGNES_API_KEY not found in .env or environment');
  process.exit(1);
}

// ===== UTILS =====
function logStatus(msg: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${msg}`);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, operation: string): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      logStatus(`🔄 ${operation} — attempt ${i + 1}/${MAX_RETRIES}`);
      const result = await fn();
      logStatus(`✅ ${operation} — success`);
      return result;
    } catch (err: any) {
      lastError = err;
      const isQueueFull = err?.response?.status === 503 || 
                          err?.message?.includes('queue') ||
                          err?.message?.includes('Queue');
      
      if (!isQueueFull || i === MAX_RETRIES - 1) {
        throw err;
      }
      
      logStatus(`⏳ ${operation} — queue full, retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }
  
  throw lastError;
}

// ===== STAGE 1: Generate Image =====
async function generateImage(prompt: string): Promise<string> {
  const payload = {
    model: 'agnes-image-2.5-flash',
    prompt,
    size: '1K',
    ratio: '1:1',
    extra_body: {
      response_format: 'url'
    }
  };

  const response = await withRetry(
    async () => {
      const res = await axios.post(
        `${API_BASE}${IMAGE_ENDPOINT}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return res.data;
    },
    'Image generation'
  );

  const imageUrl = response.data?.[0]?.url;
  if (!imageUrl) {
    throw new Error('No image URL in response');
  }

  // Save to file
  const imagePath = resolve(process.cwd(), 'image_url.txt');
  writeFileSync(imagePath, imageUrl, 'utf8');
  logStatus(`💾 Image URL saved to image_url.txt`);
  
  return imageUrl;
}

// ===== STAGE 2: Generate Video =====
async function generateVideo(imageUrl: string): Promise<string> {
  const payload = {
    model: 'agnes-video-2.5-flash',
    prompt: 'A Pixar/Disney style 3D animated character portrait spinning slowly in a full 360-degree circle for two complete rotations over approximately 4 seconds. The character turns smoothly showing all angles — front, left side, back, right side, front again. Cinematic lighting, pure dark background, smooth rotation, Pixar-quality animation, character identity stays consistent throughout the spin.',
    image: imageUrl,
    seconds: 4,
    mode: 'keyframe',
    size: '720P',
    aspect_ratio: '16:9'
  };

  const response = await withRetry(
    async () => {
      const res = await axios.post(
        `${API_BASE}${VIDEO_ENDPOINT}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return res.data;
    },
    'Video generation'
  );

  const taskId = response.video_id || response.id || response.task_id;
  if (!taskId) {
    throw new Error('No task_id in video response');
  }

  // Save to file
  const videoIdPath = resolve(process.cwd(), 'video_id.txt');
  writeFileSync(videoIdPath, taskId, 'utf8');
  logStatus(`💾 Task ID saved to video_id.txt: ${taskId}`);
  
  return taskId;
}

// ===== STAGE 3: Retrieve Video =====
async function retrieveVideo(taskId: string): Promise<string> {
  // Poll until complete (max 5 minutes)
  const maxPolls = 30;
  let polls = 0;
  
  while (polls < maxPolls) {
    polls++;
    logStatus(`🔍 Polling video status — attempt ${polls}/${maxPolls}`);
    
    try {
      const res = await axios.get(
        `${API_BASE}${STATUS_ENDPOINT}`,
        {
          params: {
            video_id: taskId,
            model_name: 'agnes-video-2.5-flash'
          },
          headers: {
            Authorization: `Bearer ${API_KEY}`
          }
        }
      );
      
      const status = res.data.status;
      const progress = res.data.progress || 0;
      logStatus(`📊 Status: ${status} (${progress}%)`);
      
      if (status === 'completed') {
        const videoUrl = res.data.url;
        if (!videoUrl) {
          throw new Error('No video URL in completed response');
        }
        
        // Save to file
        const videoUrlPath = resolve(process.cwd(), 'video_url.txt');
        writeFileSync(videoUrlPath, videoUrl, 'utf8');
        logStatus(`💾 Video URL saved to video_url.txt`);
        
        return videoUrl;
      }
      
      if (status === 'failed') {
        throw new Error(res.data.error?.message || 'Video generation failed');
      }
      
      // Wait before next poll
      await sleep(RETRY_DELAY_MS);
      
    } catch (err: any) {
      if (err.response?.status === 503) {
        logStatus(`⏳ Service busy, retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        throw err;
      }
    }
  }
  
  throw new Error('Video generation timed out after 5 minutes');
}

// ===== MAIN =====
async function main() {
  const args = process.argv.slice(2);
  const promptIndex = args.indexOf('--prompt');
  
  let prompt = 'Create an image of a normal human avatar with pixar like qualities';
  
  if (promptIndex !== -1 && args[promptIndex + 1]) {
    prompt = args[promptIndex + 1];
  }
  
  logStatus('🚀 Starting Agnes AI Pipeline');
  logStatus(`📝 Prompt: ${prompt}`);
  
  try {
    // Stage 1: Generate Image
    logStatus('━'.repeat(50));
    logStatus('STAGE 1: Image Generation');
    logStatus('━'.repeat(50));
    const imageUrl = await generateImage(prompt);
    logStatus(`🖼️  Image URL: ${imageUrl}`);
    
    // Stage 2: Generate Video
    logStatus('━'.repeat(50));
    logStatus('STAGE 2: Video Generation');
    logStatus('━'.repeat(50));
    const taskId = await generateVideo(imageUrl);
    logStatus(`🎬 Task ID: ${taskId}`);
    
    // Stage 3: Retrieve Video
    logStatus('━'.repeat(50));
    logStatus('STAGE 3: Video Retrieval');
    logStatus('━'.repeat(50));
    const videoUrl = await retrieveVideo(taskId);
    logStatus(`🎥 Video URL: ${videoUrl}`);
    
    logStatus('━'.repeat(50));
    logStatus('✅ Pipeline complete!');
    logStatus('━'.repeat(50));
    
  } catch (error: any) {
    logStatus('❌ Pipeline failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
