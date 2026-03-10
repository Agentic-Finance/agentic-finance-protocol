'use client';
/**
 * PayPol Icon System — powered by HugeIcons
 * https://hugeicons.com
 *
 * Centralized icon wrapper that provides a consistent API across the entire app.
 * Usage:  import { ShieldCheckIcon, BoltIcon } from '@/app/components/icons';
 *         <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />
 */

import React, { forwardRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import type { IconSvgElement } from '@hugeicons/react';

// ── Icon data imports from core-free-icons ─────────────────────
import {
    // Shield / Security
    Shield01Icon as _Shield01,
    ShieldBlockchainIcon as _ShieldBlockchain,
    ShieldEnergyIcon as _ShieldEnergy,
    ShieldKeyIcon as _ShieldKey,
    LockKeyIcon as _LockKey,
    Key01Icon as _Key01,

    // Navigation / Arrows
    ArrowRight01Icon as _ArrowRight01,
    ArrowLeft01Icon as _ArrowLeft01,
    ArrowDown01Icon as _ArrowDown01,
    ArrowUp01Icon as _ArrowUp01,
    ArrowUpRight01Icon as _ArrowUpRight01,
    ArrowTurnBackwardIcon as _ArrowTurnBackward,
    ArrowReloadHorizontalIcon as _ArrowReload,
    ArrowLeftRightIcon as _ArrowLeftRight,
    SquareArrowUpRightIcon as _SquareArrowUpRight,

    // Actions
    PlusSignIcon as _PlusSign,
    Cancel01Icon as _Cancel01,
    CancelCircleIcon as _CancelCircle,
    Delete01Icon as _Delete01,
    Copy01Icon as _Copy01,
    ClipboardIcon as _Clipboard,
    Download01Icon as _Download01,
    Upload01Icon as _Upload01,
    Search01Icon as _Search01,
    EyeIcon as _Eye,
    ViewOffIcon as _ViewOff,
    PlayIcon as _Play,
    PauseIcon as _Pause,
    Share01Icon as _Share01,

    // Status / Feedback
    CheckmarkCircle01Icon as _CheckmarkCircle01,
    CheckmarkBadge01Icon as _CheckmarkBadge01,
    AlertCircleIcon as _AlertCircle,
    AlertDiamondIcon as _AlertDiamond,
    BadgeInfoIcon as _BadgeInfo,

    // Data / Analytics
    ChartBarIncreasingIcon as _ChartBarIncreasing,
    ChartIncreaseIcon as _ChartIncrease,
    AnalyticsUpIcon as _AnalyticsUp,
    Pulse01Icon as _Pulse01,
    Activity01Icon as _Activity01,
    SignalFull01Icon as _SignalFull01,

    // Finance / Money
    CreditCardIcon as _CreditCard,
    Cash01Icon as _Cash01,
    BankIcon as _Bank,
    Dollar01Icon as _Dollar01,
    DollarCircleIcon as _DollarCircle,
    Coins01Icon as _Coins01,
    Wallet01Icon as _Wallet01,
    BalanceScaleIcon as _BalanceScale,

    // Tech / AI
    AiChipIcon as _AiChip,
    AiBrain01Icon as _AiBrain01,
    AiNetworkIcon as _AiNetwork,
    AiSecurityIcon as _AiSecurity01,
    Robot01Icon as _Robot01,
    CommandLineIcon as _CommandLine,
    SourceCodeIcon as _SourceCode,
    CodeIcon as _Code,
    Blockchain04Icon as _Blockchain04,
    DatabaseIcon as _Database,

    // Documents / Files
    DocumentAttachmentIcon as _DocumentAttachment,
    DocumentCodeIcon as _DocumentCode,
    DocumentValidationIcon as _DocumentValidation,
    File01Icon as _File01,
    Attachment01Icon as _Attachment01,

    // Time
    Clock01Icon as _Clock01,
    Time01Icon as _Time01,

    // People
    UserGroupIcon as _UserGroup,
    UserMultipleIcon as _UserMultiple,

    // Objects / Misc
    Home01Icon as _Home01,
    GlobeIcon as _Globe,
    Globe02Icon as _Globe02,
    GlobalIcon as _Global,
    Rocket01Icon as _Rocket01,
    BulbIcon as _Bulb,
    ZapIcon as _Zap,
    FlashIcon as _Flash,
    FireIcon as _Fire,
    StarIcon as _Star,
    StarHalfIcon as _StarHalf,
    SparklesIcon as _Sparkles,
    BookOpen01Icon as _BookOpen01,
    Briefcase01Icon as _Briefcase01,
    PuzzleIcon as _Puzzle,
    DeliveryTruck01Icon as _DeliveryTruck01,
    ShoppingCart01Icon as _ShoppingCart01,
    Wrench01Icon as _Wrench01,
    Award01Icon as _Award01,
    FactoryIcon as _Factory,
    Message01Icon as _Message01,
    Chat01Icon as _Chat01,
    Link01Icon as _Link01,
    SettingDone01Icon as _SettingDone01,
} from '@hugeicons/core-free-icons';


// ── Helper: size from className ────────────────────────────────
function extractSize(className?: string): number {
    if (!className) return 20;
    // Match w-N or h-N patterns (Tailwind sizes → pixels)
    const sizeMap: Record<string, number> = {
        '2': 8, '2.5': 10, '3': 12, '3.5': 14, '4': 16, '4.5': 18,
        '5': 20, '6': 24, '7': 28, '8': 32, '9': 36, '10': 40, '12': 48,
    };
    const match = className.match(/(?:^|\s)[wh]-(\d+(?:\.\d+)?)/);
    if (match) return sizeMap[match[1]] || 20;
    return 20;
}

// ── Factory: create a named icon component ─────────────────────
function createIcon(iconData: IconSvgElement, displayName: string) {
    const Icon = forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
        ({ className, ...props }, ref) => {
            const size = extractSize(className);
            // Filter out SVG-incompatible props that might come from parent
            const { color, ...svgProps } = props as any;
            return (
                <HugeiconsIcon
                    icon={iconData}
                    size={size}
                    className={className}
                    ref={ref}
                    strokeWidth={1.5}
                    {...svgProps}
                />
            );
        }
    );
    Icon.displayName = displayName;
    return Icon;
}

// ══════════════════════════════════════════════════════════════════
// EXPORTED ICONS — drop-in replacements for Heroicons / Lucide
// ══════════════════════════════════════════════════════════════════

// ── Shield / Security ──────────────────────────────────────────
export const ShieldCheckIcon      = createIcon(_ShieldBlockchain, 'ShieldCheckIcon');
export const ShieldAlertIcon      = createIcon(_ShieldEnergy, 'ShieldAlertIcon');
export const ShieldKeyIcon        = createIcon(_ShieldKey, 'ShieldKeyIcon');
export const ShieldIcon           = createIcon(_Shield01, 'ShieldIcon');
export const LockIcon             = createIcon(_LockKey, 'LockIcon');
export const KeyIcon              = createIcon(_Key01, 'KeyIcon');
export const AiSecurityIcon       = createIcon(_AiSecurity01, 'AiSecurityIcon');

// ── Navigation / Arrows ────────────────────────────────────────
export const ArrowRightIcon       = createIcon(_ArrowRight01, 'ArrowRightIcon');
export const ArrowLeftIcon        = createIcon(_ArrowLeft01, 'ArrowLeftIcon');
export const ArrowDownIcon        = createIcon(_ArrowDown01, 'ArrowDownIcon');
export const ArrowUpIcon          = createIcon(_ArrowUp01, 'ArrowUpIcon');
export const ArrowUpRightIcon     = createIcon(_ArrowUpRight01, 'ArrowUpRightIcon');
export const ArrowUturnLeftIcon   = createIcon(_ArrowTurnBackward, 'ArrowUturnLeftIcon');
export const ArrowPathIcon        = createIcon(_ArrowReload, 'ArrowPathIcon');
export const ArrowsRightLeftIcon  = createIcon(_ArrowLeftRight, 'ArrowsRightLeftIcon');
export const ArrowTopRightOnSquareIcon = createIcon(_SquareArrowUpRight, 'ArrowTopRightOnSquareIcon');
export const ChevronRightIcon     = createIcon(_ArrowRight01, 'ChevronRightIcon');
export const ChevronLeftIcon      = createIcon(_ArrowLeft01, 'ChevronLeftIcon');
export const ChevronDownIcon      = createIcon(_ArrowDown01, 'ChevronDownIcon');
export const ChevronUpIcon        = createIcon(_ArrowUp01, 'ChevronUpIcon');

// ── Actions ────────────────────────────────────────────────────
export const PlusIcon             = createIcon(_PlusSign, 'PlusIcon');
export const XMarkIcon            = createIcon(_Cancel01, 'XMarkIcon');
export const XCircleIcon          = createIcon(_CancelCircle, 'XCircleIcon');
export const TrashIcon            = createIcon(_Delete01, 'TrashIcon');
export const ClipboardDocumentIcon = createIcon(_Copy01, 'ClipboardDocumentIcon');
export const ClipboardIcon        = createIcon(_Clipboard, 'ClipboardIcon');
export const ArrowDownTrayIcon    = createIcon(_Download01, 'ArrowDownTrayIcon');
export const DocumentArrowDownIcon = createIcon(_Download01, 'DocumentArrowDownIcon');
export const ArrowUpTrayIcon      = createIcon(_Upload01, 'ArrowUpTrayIcon');
export const MagnifyingGlassIcon  = createIcon(_Search01, 'MagnifyingGlassIcon');
export const SearchIcon           = createIcon(_Search01, 'SearchIcon');
export const EyeIcon              = createIcon(_Eye, 'EyeIcon');
export const EyeSlashIcon         = createIcon(_ViewOff, 'EyeSlashIcon');
export const PlayIcon             = createIcon(_Play, 'PlayIcon');
export const PauseIcon            = createIcon(_Pause, 'PauseIcon');
export const ShareIcon            = createIcon(_Share01, 'ShareIcon');
export const ExternalLinkIcon     = createIcon(_SquareArrowUpRight, 'ExternalLinkIcon');

// ── Status / Feedback ──────────────────────────────────────────
export const CheckCircleIcon      = createIcon(_CheckmarkCircle01, 'CheckCircleIcon');
export const CheckBadgeIcon       = createIcon(_CheckmarkBadge01, 'CheckBadgeIcon');
export const ExclamationTriangleIcon = createIcon(_AlertDiamond, 'ExclamationTriangleIcon');
export const AlertCircleIcon      = createIcon(_AlertCircle, 'AlertCircleIcon');
export const InformationCircleIcon = createIcon(_BadgeInfo, 'InformationCircleIcon');

// ── Data / Analytics ───────────────────────────────────────────
export const ChartBarIcon         = createIcon(_ChartBarIncreasing, 'ChartBarIcon');
export const ArrowTrendingUpIcon  = createIcon(_AnalyticsUp, 'ArrowTrendingUpIcon');
export const ChartIncreaseIcon    = createIcon(_ChartIncrease, 'ChartIncreaseIcon');
export const PulseIcon            = createIcon(_Pulse01, 'PulseIcon');
export const ActivityIcon         = createIcon(_Activity01, 'ActivityIcon');
export const SignalIcon           = createIcon(_SignalFull01, 'SignalIcon');

// ── Finance / Money ────────────────────────────────────────────
export const CreditCardIcon       = createIcon(_CreditCard, 'CreditCardIcon');
export const BanknotesIcon        = createIcon(_Cash01, 'BanknotesIcon');
export const BankIcon             = createIcon(_Bank, 'BankIcon');
export const CurrencyDollarIcon   = createIcon(_DollarCircle, 'CurrencyDollarIcon');
export const CoinsIcon            = createIcon(_Coins01, 'CoinsIcon');
export const WalletIcon           = createIcon(_Wallet01, 'WalletIcon');
export const ScaleIcon            = createIcon(_BalanceScale, 'ScaleIcon');

// ── Tech / AI ──────────────────────────────────────────────────
export const CpuChipIcon          = createIcon(_AiChip, 'CpuChipIcon');
export const AiBrainIcon          = createIcon(_AiBrain01, 'AiBrainIcon');
export const AiNetworkIcon        = createIcon(_AiNetwork, 'AiNetworkIcon');
export const RobotIcon            = createIcon(_Robot01, 'RobotIcon');
export const CommandLineIcon      = createIcon(_CommandLine, 'CommandLineIcon');
export const CodeBracketIcon      = createIcon(_SourceCode, 'CodeBracketIcon');
export const CodeIcon             = createIcon(_Code, 'CodeIcon');
export const CubeTransparentIcon  = createIcon(_Blockchain04, 'CubeTransparentIcon');
export const ServerStackIcon      = createIcon(_Database, 'ServerStackIcon');
export const TerminalIcon         = createIcon(_CommandLine, 'TerminalIcon');

// ── Documents / Files ──────────────────────────────────────────
export const DocumentTextIcon     = createIcon(_File01, 'DocumentTextIcon');
export const DocumentCheckIcon    = createIcon(_DocumentValidation, 'DocumentCheckIcon');
export const DocumentCodeIcon     = createIcon(_DocumentCode, 'DocumentCodeIcon');
export const PaperClipIcon        = createIcon(_Attachment01, 'PaperClipIcon');
export const LinkIcon             = createIcon(_Link01, 'LinkIcon');

// ── Time ───────────────────────────────────────────────────────
export const ClockIcon            = createIcon(_Clock01, 'ClockIcon');

// ── People ─────────────────────────────────────────────────────
export const UsersIcon            = createIcon(_UserMultiple, 'UsersIcon');
export const UserGroupIcon        = createIcon(_UserGroup, 'UserGroupIcon');

// ── Objects / Misc ─────────────────────────────────────────────
export const HomeIcon             = createIcon(_Home01, 'HomeIcon');
export const GlobeAltIcon         = createIcon(_Globe02, 'GlobeAltIcon');
export const GlobeIcon            = createIcon(_Globe, 'GlobeIcon');
export const RocketLaunchIcon     = createIcon(_Rocket01, 'RocketLaunchIcon');
export const LightBulbIcon        = createIcon(_Bulb, 'LightBulbIcon');
export const BoltIcon             = createIcon(_Zap, 'BoltIcon');
export const ZapIcon              = createIcon(_Zap, 'ZapIcon');
export const FlashIcon            = createIcon(_Flash, 'FlashIcon');
export const FireIcon             = createIcon(_Fire, 'FireIcon');
export const StarIcon             = createIcon(_Star, 'StarIcon');
export const StarHalfIcon         = createIcon(_StarHalf, 'StarHalfIcon');
export const SparklesIcon         = createIcon(_Sparkles, 'SparklesIcon');
export const BookOpenIcon         = createIcon(_BookOpen01, 'BookOpenIcon');
export const BriefcaseIcon        = createIcon(_Briefcase01, 'BriefcaseIcon');
export const PuzzlePieceIcon      = createIcon(_Puzzle, 'PuzzlePieceIcon');
export const TruckIcon            = createIcon(_DeliveryTruck01, 'TruckIcon');
export const ShoppingCartIcon     = createIcon(_ShoppingCart01, 'ShoppingCartIcon');
export const WrenchScrewdriverIcon = createIcon(_Wrench01, 'WrenchScrewdriverIcon');
export const TrophyIcon           = createIcon(_Award01, 'TrophyIcon');
export const FactoryIcon          = createIcon(_Factory, 'FactoryIcon');
export const ChatBubbleLeftRightIcon = createIcon(_Chat01, 'ChatBubbleLeftRightIcon');
export const MessageIcon          = createIcon(_Message01, 'MessageIcon');

// ── Lucide compat aliases ──────────────────────────────────────
export const Activity             = ActivityIcon;
export const ShieldAlert          = ShieldAlertIcon;
export const Terminal             = TerminalIcon;
export const CheckCircle2         = CheckCircleIcon;
export const Search               = SearchIcon;
export const ExternalLink         = ExternalLinkIcon;
export const TrendingUp           = ArrowTrendingUpIcon;
export const ShieldCheck          = ShieldCheckIcon;
export const Cpu                  = CpuChipIcon;
export const BrainCircuit         = AiBrainIcon;
export const Globe                = GlobeIcon;
export const Zap                  = ZapIcon;
export const Users                = UsersIcon;
export const Factory              = FactoryIcon;
export const ShoppingCart         = ShoppingCartIcon;
export const HeartPulse           = PulseIcon;
export const Coins                = CoinsIcon;
export const Briefcase            = BriefcaseIcon;
export const Lock                 = LockIcon;
export const ArrowRight           = ArrowRightIcon;
