import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 配置路径
const CIRCUIT_DIR = path.join(__dirname, '../../circom-circuits/build');
const WASM_FILE = path.join(CIRCUIT_DIR, 'example_js', 'example.wasm');
const ZKEY_FILE = path.join(CIRCUIT_DIR, 'example_final.zkey');
const VKEY_FILE = path.join(CIRCUIT_DIR, 'verification_key.json');

// 健康检查
app.get('/health', (req: Request, res: Response) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'zkp-backend'
    });
});

// 生成证明 API
app.post('/api/proof/generate', async (req: Request, res: Response) => {
    try {
        const { input } = req.body;

        if (!input || !input.a || !input.b) {
            return res.status(400).json({ 
                error: 'Invalid input. Required: { input: { a: number, b: number } }' 
            });
        }

        console.log('🔐 Generating proof for input:', input);

        // 检查文件
        if (!fs.existsSync(WASM_FILE) || !fs.existsSync(ZKEY_FILE)) {
            return res.status(500).json({ 
                error: 'Circuit files not found. Run build script first.' 
            });
        }

        // 生成证明
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            input,
            WASM_FILE,
            ZKEY_FILE
        );

        console.log('✅ Proof generated. Public signals:', publicSignals);

        res.json({
            success: true,
            proof,
            publicSignals,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error generating proof:', error);
        res.status(500).json({ 
            error: 'Failed to generate proof',
            message: error.message 
        });
    }
});

// 验证证明 API
app.post('/api/proof/verify', async (req: Request, res: Response) => {
    try {
        const { proof, publicSignals } = req.body;

        if (!proof || !publicSignals) {
            return res.status(400).json({ 
                error: 'Invalid input. Required: { proof, publicSignals }' 
            });
        }

        console.log('🔍 Verifying proof...');

        // 读取验证密钥
        if (!fs.existsSync(VKEY_FILE)) {
            return res.status(500).json({ 
                error: 'Verification key not found' 
            });
        }

        const vkey = JSON.parse(fs.readFileSync(VKEY_FILE, 'utf8'));

        // 验证证明
        const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);

        console.log(`${verified ? '✅' : '❌'} Verification result: ${verified}`);

        res.json({
            success: true,
            verified,
            publicSignals,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error verifying proof:', error);
        res.status(500).json({ 
            error: 'Failed to verify proof',
            message: error.message 
        });
    }
});

// 导出 Solidity calldata API
app.post('/api/proof/export-calldata', async (req: Request, res: Response) => {
    try {
        const { proof, publicSignals } = req.body;

        if (!proof || !publicSignals) {
            return res.status(400).json({ 
                error: 'Invalid input. Required: { proof, publicSignals }' 
            });
        }

        const calldata = await snarkjs.groth16.exportSolidityCallData(
            proof,
            publicSignals
        );

        res.json({
            success: true,
            calldata,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('❌ Error exporting calldata:', error);
        res.status(500).json({ 
            error: 'Failed to export calldata',
            message: error.message 
        });
    }
});

// 获取电路信息 API
app.get('/api/circuit/info', (req: Request, res: Response) => {
    try {
        const vkey = JSON.parse(fs.readFileSync(VKEY_FILE, 'utf8'));

        res.json({
            success: true,
            info: {
                protocol: vkey.protocol,
                curve: vkey.curve,
                nPublic: vkey.nPublic
            }
        });

    } catch (error: any) {
        res.status(500).json({ 
            error: 'Failed to get circuit info',
            message: error.message 
        });
    }
});

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, next: any) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log('🚀 ZKP Backend Service');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📡 Available endpoints:');
    console.log('   POST /api/proof/generate');
    console.log('   POST /api/proof/verify');
    console.log('   POST /api/proof/export-calldata');
    console.log('   GET  /api/circuit/info');
    console.log('   GET  /health\n');
});

export default app;
