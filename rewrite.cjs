const fs = require('fs');
let code = fs.readFileSync('src/apps/main/App.tsx', 'utf-8');

// Replace imports
code = code.replace(
  "import { DataConfig } from '../../features/config/DataConfig';",
  `import { DataConfig } from '../../features/config/DataConfig';\nimport { LandingPage } from './LandingPage';\nimport { PasswordModal } from '../../components/PasswordModal';\nimport { getSpaceData, updateTransactions, updateConfig, type SpaceData } from '../../lib/api';\nimport { Cloud, CloudOff, CloudUpload, Share2 } from 'lucide-react';`
);

// Replace state block
const stateStart = code.indexOf('export default function MahjongTracker() {\n  // 状态');
const pipelineStart = code.indexOf('  // 使用数据管道处理交易数据');

if (stateStart === -1 || pipelineStart === -1) {
    console.error("Could not find boundaries");
    process.exit(1);
}

const newStateBlock = `export default function MahjongTracker() {
  // 路由与空间状态
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');
  
  // 密码相关
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<((pin: string) => Promise<void>) | null>(null);
  const [isSystemModalOpen, setIsSystemModalOpen] = useState(false);

  // 核心数据状态
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistItem[]>([]);
  const [mergeRules, setMergeRules] = useState<MergeRule[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(DEFAULT_FILTER_OPTIONS);

  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 1. 解析 URL 并加载数据
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    
    if (id) {
      setSpaceId(id);
      getSpaceData(id)
        .then((data) => {
          setTransactions(data.tx || []);
          if (data.cfg) {
            setWhitelist(data.cfg.whitelist || []);
            setMergeRules(data.cfg.mergeRules || []);
            setFilterOptions(data.cfg.filterOptions || DEFAULT_FILTER_OPTIONS);
          }
        })
        .catch(err => {
          setErrorMsg('拉取空间数据失败: ' + err.message);
        })
        .finally(() => {
          setIsInitializing(false);
        });
    } else {
      setIsInitializing(false);
    }
  }, []);

  // 2. 包装有密码保护的写操作
  const executeWithAuth = useCallback(async (action: (pin: string) => Promise<void>) => {
    if (!spaceId) return;
    const savedPin = sessionStorage.getItem(\`maja_pin_\${spaceId}\`);
    if (savedPin) {
      try {
        await action(savedPin);
      } catch (err: any) {
        if (err.message === 'Invalid PIN') {
          sessionStorage.removeItem(\`maja_pin_\${spaceId}\`);
          setPendingAction(() => action);
          setIsPasswordModalOpen(true);
        } else {
          throw err;
        }
      }
    } else {
      setPendingAction(() => action);
      setIsPasswordModalOpen(true);
    }
  }, [spaceId]);

  // 3. 同步状态包装器
  const syncTransactions = useCallback((newTx: Transaction[]) => {
    if (!spaceId) return;
    setTransactions(newTx);
    setSyncStatus('syncing');
    executeWithAuth(async (pin) => {
      await updateTransactions(spaceId, pin, newTx);
      setSyncStatus('synced');
    }).catch(e => {
      setSyncStatus('error');
      setErrorMsg('同步交易失败: ' + e.message);
    });
  }, [spaceId, executeWithAuth]);

  const syncConfig = useCallback((cfgData: Partial<SpaceData['cfg']>) => {
    if (!spaceId) return;
    setSyncStatus('syncing');
    executeWithAuth(async (pin) => {
      const fullCfg = { mergeRules, whitelist, filterOptions, ...cfgData };
      await updateConfig(spaceId, pin, fullCfg);
      setSyncStatus('synced');
    }).catch(e => {
      setSyncStatus('error');
      setErrorMsg('同步配置失败: ' + e.message);
    });
  }, [spaceId, mergeRules, whitelist, filterOptions, executeWithAuth]);

  // 修改所有 set 方法，接入 sync
  const updateWhitelist = useCallback((updater: (prev: WhitelistItem[]) => WhitelistItem[]) => {
    setWhitelist(prev => {
      const next = updater(prev);
      syncConfig({ whitelist: next });
      return next;
    });
  }, [syncConfig]);

  const updateMergeRules = useCallback((updater: (prev: MergeRule[]) => MergeRule[]) => {
    setMergeRules(prev => {
      const next = updater(prev);
      syncConfig({ mergeRules: next });
      return next;
    });
  }, [syncConfig]);

  const updateFilterOptions = useCallback((updater: (prev: FilterOptions) => FilterOptions) => {
    setFilterOptions(prev => {
      const next = updater(prev);
      syncConfig({ filterOptions: next });
      return next;
    });
  }, [syncConfig]);

`;

code = code.substring(0, stateStart) + newStateBlock + code.substring(pipelineStart);

code = code.replace(/setWhitelist\(/g, 'updateWhitelist(');
code = code.replace(/setMergeRules\(/g, 'updateMergeRules(');
code = code.replace(/setFilterOptions\(/g, 'updateFilterOptions(');

// Now handle rendering LandingPage if not initialized
const returnDivStart = code.indexOf('  return (\n    <div className="flex h-screen bg-slate-50 overflow-hidden">');
if (returnDivStart !== -1) {
  const newReturn = `  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-emerald-500" size={48} /></div>;
  }
  
  if (!spaceId) {
    return <LandingPage />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">`;
  code = code.substring(0, returnDivStart) + newReturn + code.substring(returnDivStart + '  return (\n    <div className="flex h-screen bg-slate-50 overflow-hidden">'.length);
}

// Add PasswordModal to the end
const finalDivIndex = code.lastIndexOf('</div>');
if (finalDivIndex !== -1) {
  const modCode = `
      <PasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPendingAction(null);
        }}
        onSubmit={async (pin) => {
          if (pendingAction) {
            await pendingAction(pin);
            sessionStorage.setItem(\`maja_pin_\${spaceId}\`, pin);
          }
          setIsPasswordModalOpen(false);
          setPendingAction(null);
        }}
      />
    </div>`;
  code = code.substring(0, finalDivIndex) + modCode + code.substring(finalDivIndex + '</div>'.length);
}

fs.writeFileSync('src/apps/main/App.tsx', code);
console.log('App.tsx transformed');
