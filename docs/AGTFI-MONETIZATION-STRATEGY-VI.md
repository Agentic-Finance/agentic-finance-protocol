# AGTFI: CHIẾN LƯỢC KIẾM TIỀN ĐỘNG CƠ KÉP
## Tài liệu Nội bộ — Phiên bản 2.0

> Cập nhật: 01/03/2026
> Phân loại: NỘI BỘ — KHÔNG CHIA SẺ

---

## ĐỊNH VỊ

Agentic Finance không chỉ là một công cụ thanh toán — Agentic Finance là **hạ tầng tài chính cho nền Kinh tế AI** sắp tới. Chúng ta vận hành một **Mô hình Kinh doanh Động cơ Kép có khả năng mở rộng cao** (Dual-Engine Business Model), đồng thời tích hợp lớp cầu nối Fiat giúp loại bỏ rào cản gia nhập cho người dùng truyền thống.

---

## MỤC LỤC

1. [ENGINE 1: Ngân quỹ Doanh nghiệp & Bảng lương (B2B Cash Cow)](#engine-1)
2. [ENGINE 2: Sàn Giao dịch Neural Agent (Nền tảng Tăng trưởng Cao)](#engine-2)
3. [ENGINE 3: Lớp Tin cậy — Kiếm tiền từ Trọng tài (Trust Layer)](#engine-3)
4. [ENGINE 4: Cầu nối Fiat-to-Crypto (Đầu vào Thanh khoản)](#engine-4)
5. [Lộ trình theo Phase](#roadmap)
6. [Bảng Phí Tổng hợp](#fee-table)
7. [Dự phóng Doanh thu](#projections)
8. [Triển khai Kỹ thuật](#technical)

---

<a id="engine-1"></a>
## ENGINE 1: NGÂN QUỸ DOANH NGHIỆP & BẢNG LƯƠNG (B2B Cash Cow)

> Động cơ này tạo ra **dòng tiền tức thì, có thể dự đoán** bằng cách giải quyết nỗi đau khổng lồ của quản lý bảng lương và ngân quỹ Web3.

### 1.1 Phí Giao thức Giải ngân Hàng loạt (Mass Disbursal Protocol Fee)

| Thông số | Giá trị |
|---|---|
| Cơ chế | Phí cố định **0.2%** trên tổng số tiền giải ngân |
| Phí tối đa | **$5.00** mỗi đợt (batch) |
| Áp dụng cho | Bảng lương, airdrop, thanh toán nhà cung cấp |
| Smart Contract | `Agentic FinanceMultisendVaultV2` (`0x25f4d3f1...`) |

**Giá trị cho khách hàng:**
- Công ty tiết kiệm hàng giờ làm thủ công so với gửi từng giao dịch riêng lẻ
- Tránh biến động phí gas bằng cách gộp giao dịch (batched transactions)
- Một giao dịch duy nhất cho hàng trăm người nhận — tiết kiệm gas lên đến 90%

**Ví dụ tính phí:**
```
Công ty A trả lương 50 nhân viên, tổng $25,000:
├── Phí giao thức: 0.2% × $25,000 = $50.00
├── Nhưng max $5 → Phí thực thu: $5.00
├── Gas on-chain: ~$0.15 (1 batch tx thay vì 50 tx riêng lẻ)
└── Tổng chi phí cho công ty: $5.15 (so với ~$7.50 gas nếu gửi riêng)

Freelancer trả 3 cộng sự, tổng $500:
├── Phí giao thức: 0.2% × $500 = $1.00
├── Dưới max $5 → Phí thực thu: $1.00
└── Tổng chi phí: $1.15
```

### 1.2 Phantom Shield — Phí Cao cấp ZK-Privacy

| Thông số | Giá trị |
|---|---|
| Cơ chế | Phí bổ sung **0.5%** khi bật tính năng "Phantom Shield" |
| Phí tối đa | **$10.00** mỗi đợt |
| Công nghệ | ZK-SNARK PLONK + Poseidon Commitment |
| Smart Contract | `AgtFiShieldVaultV2` (`0x3B4b4797...`) |
| Verifier | `PlonkVerifierV2` (`0x9FB90e9F...`) |

**Giá trị cho khách hàng:**
- Lãnh đạo và DAO sẵn sàng trả phí cao cấp để **che giấu lương lãnh đạo** và thanh toán nhà cung cấp nhạy cảm khỏi block explorer công khai
- Sử dụng công nghệ bằng chứng không tiết lộ (zero-knowledge proof) — giao dịch on-chain nhưng **không ai biết ai nhận bao nhiêu**
- Commitment được lưu on-chain, Daemon xử lý ZK withdrawal tự động

**Ví dụ tính phí:**
```
DAO trả lương ban giám đốc $50,000 với Phantom Shield:
├── Phí giao thức cơ bản: $5.00 (max)
├── Phí Phantom Shield: 0.5% × $50,000 = $250 → max $10.00
├── Tổng phí Agentic Finance: $5.00 + $10.00 = $15.00
└── DAO tiết kiệm: Không bị lộ thông tin lương trên explorer

Startup trả 5 dev $3,000 với Shield:
├── Phí giao thức: 0.2% × $3,000 = $6.00 → max $5.00
├── Phí Shield: 0.5% × $3,000 = $15.00 → max $10.00
├── Tổng phí Agentic Finance: $5.00 + $10.00 = $15.00
└── Mỗi dev nhận tiền riêng tư — không ai biết ai được bao nhiêu
```

**Quy trình kỹ thuật Shield (Production):**
```
1. Employer tạo batch → bật Phantom Shield
2. Frontend sinh Poseidon commitment per employee: C = Poseidon(secret, nullifier, amount, recipient)
   → Poseidon singleton cache: ~0ms (WASM loaded 1 lần duy nhất)
3. Frontend gọi N lần ShieldVaultV2.deposit(commitment, amount) — mỗi employee 1 deposit riêng
4. Daemon (Docker container) nhận PENDING jobs → 2 path xử lý:
   → Path A (pre-deposited): Parallel proof generation (tối đa 3 concurrent) → executeShieldedPayout()
   → Path B (full lifecycle): approve → deposit → proof → payout (sequential nonce)
5. Daemon sinh PLONK proof thật via snarkjs.plonk.fullProve() → uint256[24] proof array
6. Daemon gọi ShieldVaultV2.executeShieldedPayout(proof, pubSignals, amount)
7. Mỗi worker nhận tiền riêng tư — trên explorer chỉ thấy "ShieldedWithdrawal" event
   → Không ai biết ai nhận bao nhiêu (Zcash-level privacy)
```

---

<a id="engine-2"></a>
## ENGINE 2: SÀN GIAO DỊCH NEURAL AGENT (Nền tảng Tăng trưởng Cao)

> Đây là mô hình "App Store" có khả năng mở rộng. Bằng cách mở nền tảng cho các nhà phát triển AI bên thứ ba, Agentic Finance thu được giá trị từ nền kinh tế lực lượng lao động AI đang bùng nổ mà **không cần tự xây dựng mọi agent**.

### 2.1 Phí Hoa hồng Sàn giao dịch (Marketplace Take-Rate)

| Thông số | Giá trị hiện tại | Giá trị đề xuất |
|---|---|---|
| Phí nền tảng | 8% (800 bps on-chain) | **5% (500 bps)** |
| Áp dụng khi | Job được settlement thành công | Không đổi |
| Phí tối đa cho phép | 30% (3000 bps — on-chain cap) | Không đổi |
| Smart Contract | `AgtFiNexusV2` (`0x6A467Cd4...`) | Gọi `setPlatformFee(500)` |
| Milestone Contract | `Agentic FinanceStreamV1` (`0x4fE37c46...`) | Gọi `setPlatformFee(500)` |

**Giá trị cho nhà phát triển:**
- Developer sẵn sàng trả phí vì Agentic Finance cung cấp cho họ **khách hàng doanh nghiệp sẵn sàng mua** và **thanh toán đảm bảo** qua smart contract Escrow
- Không cần marketing riêng — agent hiển thị trên OmniTerminal
- Payment bảo đảm bởi on-chain escrow — không sợ bị quỵt

**So sánh cạnh tranh:**
```
Agentic Finance (đề xuất):     5% platform fee
Fiverr:               5.5% phí người mua + 20% phí người bán = 25.5% tổng
Upwork:               10% phí freelancer
Apple App Store:      30% commission
Google Play:          15-30% commission
```

→ Agentic Finance **rẻ hơn đáng kể** so với các nền tảng marketplace khác, tạo lợi thế cạnh tranh mạnh mẽ cho AI agent creator.

**Ví dụ tính phí:**
```
AI Agent "CodeReview Pro" hoàn thành job $200:
├── Platform fee: 5% × $200 = $10.00
├── Agent nhận: $200 - $10 = $190.00
└── Agentic Finance thu: $10.00

AI Agent "DataAnalyzer" hoàn thành streaming job $1,000 (4 milestones):
├── Milestone 1 ($250): Agent nhận $237.50, Agentic Finance thu $12.50
├── Milestone 2 ($250): Agent nhận $237.50, Agentic Finance thu $12.50
├── Milestone 3 ($250): Agent nhận $237.50, Agentic Finance thu $12.50
├── Milestone 4 ($250): Agent nhận $237.50, Agentic Finance thu $12.50
└── Tổng Agentic Finance thu: $50.00
```

### 2.2 Giảm phí qua Security Deposit (Staking)

| Tier | Số tiền ký quỹ | Giảm phí | Phí thực tế |
|---|---|---|---|
| Không ký quỹ | $0 | 0% | 5.0% |
| **Bronze** | $50+ | -0.5% | **4.5%** |
| **Silver** | $200+ | -1.5% | **3.5%** |
| **Gold** | $1,000+ | -3.0% | **2.0%** |

Smart Contract: `SecurityDepositVault` (`0x8C1d4da4...`)

**Giá trị:**
- Agent chuyên nghiệp ký quỹ để giảm phí → tạo cam kết dài hạn
- Quỹ ký quỹ hoạt động như bảo hiểm — nếu agent gian lận bị slash 10%
- Tiền slash vào Insurance Pool → bồi thường cho khách hàng bị hại

### 2.3 Danh sách Agent Nổi bật (Featured Listings) — Tương lai

| Thông số | Giá trị |
|---|---|
| Cơ chế | Developer trả phí hoặc stake token để agent xuất hiện đầu kết quả tìm kiếm |
| Mô hình | Đấu giá vị trí (auction-based) hoặc phí cố định/tuần |
| Dự kiến | Phase 3 (18+ tháng) |

---

<a id="engine-3"></a>
## ENGINE 3: LỚP TIN CẬY — KIẾM TIỀN TỪ TRỌNG TÀI (Trust Layer)

> Hệ thống Escrow và Judge Dashboard phi tập trung là **hào phòng thủ cạnh tranh sâu nhất** của chúng ta. Chúng ta kiếm tiền từ việc giải quyết tranh chấp, biến **xung đột thành doanh thu** trong khi duy trì tính toàn vẹn của hệ thống.

### 3.1 Phí Phạt Trọng tài (Arbitration Penalty Fee)

| Thông số | Giá trị |
|---|---|
| Phí phạt | **3%** (300 bps) áp dụng cho bên **thua** trong tranh chấp |
| Phạt tối đa | **$10** (10e18 token units) |
| Smart Contract | `AgtFiNexusV2` — function `settleJob()` và `refundJob()` |

**Kịch bản 1 — Công ty gian lận:**
```
Agent hoàn thành job $500, công ty từ chối thanh toán vô lý.
├── Judge xem xét bằng chứng → phán quyết Agent thắng
├── Tiền escrow $500 → giải phóng cho Agent
├── Công ty bị phạt: 3% × $500 = $15.00
├── Agentic Finance thu: $15.00 (phí phạt)
└── Kết quả: Agent được trả đủ, công ty mất thêm $15
```

**Kịch bản 2 — Agent thất bại:**
```
Agent nhận job $500 nhưng giao kết quả kém chất lượng.
├── Công ty dispute → Judge phán quyết Công ty thắng
├── Tiền escrow $500 → hoàn lại Công ty
├── Agent bị phạt: 3% từ Security Deposit (nếu có)
├── Agentic Finance thu: Phần phạt + phí nền tảng đã trừ
└── Kết quả: Công ty được hoàn tiền, Agent bị giảm uy tín
```

**Giá trị:**
- Phí phạt **nghiêm túc ngăn chặn spam** và tranh chấp vô căn cứ
- Cả hai bên đều cân nhắc kỹ trước khi dispute → giảm tải cho hệ thống
- Phí phạt trang trải chi phí vận hành của Đội Trọng tài Agentic Finance
- Hệ thống rating on-chain (`ReputationRegistry`) ghi nhận kết quả → ảnh hưởng điểm uy tín

### 3.2 Bảo hiểm từ Insurance Pool

```
Dòng tiền Insurance Pool:
├── Nguồn vào:  10% tiền slash từ Security Deposit
├── Nguồn ra:   Bồi thường cho khách hàng bị hại
└── Quản lý:    On-chain qua SecurityDepositVault.insurancePayout()
```

---

<a id="engine-4"></a>
## ENGINE 4: CẦU NỐI FIAT-TO-CRYPTO (Đầu vào Thanh khoản)

> Xóa bỏ rào cản gia nhập cho người dùng truyền thống. Bất kỳ ai có thẻ tín dụng đều có thể sử dụng AI agent và dịch vụ trên Agentic Finance mà **không cần sở hữu crypto trước**.

### 4.1 Phí Xử lý Thẻ (Card Processing Fee)

| Thông số | Giá trị hiện tại | Giá trị đề xuất |
|---|---|---|
| Markup | 8% flat | **5% + $1.00 phí cố định** |
| Phí Shield ZK bổ sung | 0.2% (max $5) | **0.5% (max $10)** |
| Giao dịch tối thiểu | $1 | **$5** |
| Giao dịch tối đa | $10,000 | $10,000 |
| Thanh toán qua | Paddle (sandbox) | Paddle |
| Chi phí Paddle | ~5% + $0.50/giao dịch | ~5% + $0.50/giao dịch |

**Tại sao 5% + $1.00 thay vì 8% flat?**
```
Vấn đề với 8% flat:
├── Giao dịch $3:   charge $3.24, Paddle fee $0.66, Agentic Finance lỗ -$0.42
├── Giao dịch $10:  charge $10.80, Paddle fee $1.04, Agentic Finance lãi -$0.24
├── Giao dịch $12:  charge $12.96, Paddle fee $1.15, Agentic Finance hòa vốn
└── Breakeven: ~$12 — dưới mức này Agentic Finance LỖ mỗi giao dịch!

Giải pháp 5% + $1.00:
├── Giao dịch $5 (min):  charge $6.25, Paddle fee $0.81, lãi +$0.44 ✅
├── Giao dịch $10:  charge $11.50, Paddle fee $1.08, lãi +$0.42 ✅
├── Giao dịch $50:  charge $53.50, Paddle fee $3.18, lãi +$0.32 ✅
├── Giao dịch $100: charge $106.00, Paddle fee $5.80, lãi +$0.20 ✅
└── Không còn lỗ ở bất kỳ giao dịch nào ≥ $5!
```

**Phí $1 cố định giải quyết vấn đề:**
- Cover Paddle's $0.50 fixed fee + đảm bảo lợi nhuận tối thiểu
- User nhìn thấy rõ ràng: "5% processing + $1.00 service fee"
- Transparent hơn 8% flat (user biết chính xác mình trả bao nhiêu phí)

### 4.2 Flow Thanh toán Card

```
USER (Thẻ Visa/Mastercard)
  │
  ├─ Charge: amount × 1.05 + $1.00 + Shield fee (nếu bật)
  │
  ▼
PADDLE (Bộ xử lý Thanh toán)
  │
  ├─ Paddle giữ: ~5% + $0.50
  ├─ Agentic Finance nhận: phần còn lại (fiat)
  │
  ▼
AGTFI TREASURY (Ví On-chain: 0x33F7e5da...)
  │
  ├─ Shield TẮT → chuyển AlphaUSD trực tiếp cho user
  ├─ Shield BẬT → deposit vào ShieldVaultV2 (Poseidon commitment)
  │                └─ Daemon sinh ZK proof → executeShieldedPayout()
  │
  ▼
USER WALLET → sử dụng cho Agent Escrow hoặc giữ trong ví
```

### 4.3 Tại sao Min $5? User muốn thử thì sao?

| Phương thức | Min | Lý do |
|---|---|---|
| **Card (qua Paddle)** | $5 | Cover fixed fee, tránh lỗ |
| **Crypto (trực tiếp)** | $0.10 | Chỉ tốn gas ~$0.01, không lỗ |

**Kịch bản user mới muốn thử agent $2.97:**
```
Đã có MetaMask + crypto? → Thanh toán trực tiếp ✅ (không giới hạn min)
Chỉ có thẻ tín dụng?
├── Nạp $5 bằng card (min) → nhận 5 AlphaUSD
├── Dùng agent $2.97 → còn dư 2.03 AlphaUSD
├── Dùng thêm agent khác bằng số dư
└── Một lần nạp, dùng nhiều lần ✅
```

→ **Không block user** — chỉ yêu cầu min $5 cho card top-up, crypto trực tiếp vẫn cho phép bất kỳ số tiền nào.

---

<a id="roadmap"></a>
## LỘ TRÌNH THEO PHASE

### PHASE 1: KHỞI ĐỘNG (0–6 tháng)

**Mục tiêu:** Thu hút 1,000 user đầu tiên, $50,000 volume/tháng

| Dịch vụ | Phí | Ghi chú |
|---|---|---|
| Card → Crypto | 5% + $1.00 | Cạnh tranh với Moonpay/Transak |
| Agent Marketplace | 5% (500 bps) | Thấp hơn Fiverr/Upwork để thu hút |
| Payroll Batch | 0.2% (max $5) | Rẻ hơn gửi riêng lẻ |
| Phantom Shield | 0.5% (max $10) | Tính năng cao cấp |
| Arbitration Penalty | 3% | Ngăn chặn tranh chấp vô căn cứ |
| Min card txn | $5 | Tránh lỗ ở giao dịch nhỏ |
| Min crypto txn | $0.10 | Cho phép user thử nghiệm |

**Hành động kỹ thuật Phase 1:**
- [ ] Cập nhật `fiat-onramp.ts`: markup 8% → 5%, thêm fixedFee $1.00
- [ ] Cập nhật `calculateMarkup()`: bao gồm fixed fee
- [ ] Cập nhật Shield fee: 0.2% → 0.5%, max $5 → $10 (3 files)
- [ ] Cập nhật `negotiation-engine.ts`: 0.08 → 0.05
- [ ] Cập nhật `DealConfirmation.tsx`: CARD_MARKUP_PERCENT 8 → 5
- [ ] On-chain: Gọi `NexusV2.setPlatformFee(500)` từ owner wallet
- [ ] On-chain: Gọi `StreamV1.setPlatformFee(500)` từ owner wallet
- [ ] Deploy dashboard + test end-to-end

**Doanh thu dự kiến Phase 1:**
```
Card purchases: $25,000/tháng × ~1% margin     = $250/tháng
Agent jobs:     $15,000/tháng × 5% platform fee = $750/tháng
Payroll batch:  $10,000/tháng × 0.2%            = $20/tháng
Shield ZK:      $5,000/tháng × 0.5%             = $25/tháng
Arbitration:    ~5 disputes/tháng × $10 avg      = $50/tháng
────────────────────────────────────────────────────────────
TỔNG Phase 1:                                    ~$1,095/tháng
```

---

### PHASE 2: TĂNG TRƯỞNG (6–18 tháng)

**Mục tiêu:** 10,000 user, $500,000 volume/tháng, ra mắt Premium

| Dịch vụ | Phí | Thay đổi so với Phase 1 |
|---|---|---|
| Card → Crypto | 5% + $1.00 | Giữ nguyên |
| Agent Marketplace | 5% | Giữ nguyên |
| Payroll Batch | 0.2% (max $5) | Giữ nguyên |
| Phantom Shield | 0.5% (max $10) | Giữ nguyên |
| **Premium Subscription** | **$29/tháng** | **MỚI** |
| **API Access** | **$0.01/lệnh gọi** | **MỚI** |

**Premium Subscription bao gồm:**
- Shield ZK miễn phí (không giới hạn)
- Giảm phí card: 3% + $0.50 (thay vì 5% + $1)
- Ưu tiên xử lý agent job
- Analytics dashboard nâng cao
- Hỗ trợ ưu tiên 24/7

**Doanh thu dự kiến Phase 2:**
```
Card purchases:    $200,000/tháng × ~1%    = $2,000/tháng
Agent jobs:        $100,000/tháng × 5%     = $5,000/tháng
Payroll batch:     $50,000/tháng × 0.2%    = $100/tháng
Shield ZK:         $30,000/tháng × 0.5%    = $150/tháng
Premium subs:      50 users × $29          = $1,450/tháng
API access:        100,000 calls × $0.01   = $1,000/tháng
Arbitration:       ~20 disputes × $15 avg  = $300/tháng
──────────────────────────────────────────────────────────
TỔNG Phase 2:                               ~$10,000/tháng
```

---

### PHASE 3: MỞ RỘNG (18+ tháng)

**Mục tiêu:** 100,000 user, $5,000,000 volume/tháng, đàm phán Paddle rate

| Dịch vụ | Phí | Thay đổi |
|---|---|---|
| Card → Crypto | **3% + $0.50** | Giảm phí nhờ đàm phán Paddle rate (~3%) |
| Agent Marketplace | 5% | Giữ nguyên |
| Payroll Batch | **0.1% (max $10)** hoặc **$0.01/transfer** | Tăng nhẹ cap |
| Phantom Shield | 0.5% (max $10) | Giữ nguyên |
| Premium Subscription | $29/tháng | Giữ nguyên |
| **White-label SDK** | **$500–$5,000/tháng** | **MỚI** — cho doanh nghiệp tự triển khai |
| **Featured Listings** | **Đấu giá** | **MỚI** — agent trả phí để nổi bật |

**Tại sao giảm Card fee ở Phase 3?**
```
Phase 1-2: Paddle sandbox rate = ~5% + $0.50 → Agentic Finance charge 5% + $1
Phase 3:   Volume > $1M/tháng → đàm phán Paddle production rate ~3% + $0.30
           → Agentic Finance có thể giảm charge xuống 3% + $0.50 mà vẫn lãi
           → Phí thấp hơn → nhiều user hơn → volume cao hơn → vòng tròn tích cực
```

**Doanh thu dự kiến Phase 3:**
```
Card purchases:    $2,000,000/tháng × ~1.5%  = $30,000/tháng
Agent jobs:        $500,000/tháng × 5%       = $25,000/tháng
Payroll batch:     $500,000/tháng × 0.1%     = $500/tháng
Shield ZK:         $200,000/tháng × 0.5%     = $1,000/tháng
Premium subs:      500 users × $29           = $14,500/tháng
API access:        2,000,000 calls × $0.01   = $20,000/tháng
White-label:       10 clients × $2,000 avg   = $20,000/tháng
Featured listings: ~50 agents × $100 avg     = $5,000/tháng
Arbitration:       ~100 disputes × $20 avg   = $2,000/tháng
──────────────────────────────────────────────────────────────
TỔNG Phase 3:                                 ~$118,000/tháng
```

---

<a id="fee-table"></a>
## BẢNG PHÍ TỔNG HỢP

### Phí Hiện tại vs Đề xuất (tất cả Engine)

| # | Dịch vụ | Hiện tại | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|---|---|
| 1 | Card markup | 8% flat | **5% + $1** | 5% + $1 | **3% + $0.50** |
| 2 | Card min txn | $1 | **$5** | $5 | $5 |
| 3 | Shield ZK (Card) | 0.2% (max $5) | **0.5% (max $10)** | 0.5% | 0.5% |
| 4 | Payroll batch | 0.2% (max $5) | 0.2% (max $5) | 0.2% (max $5) | **0.1% (max $10)** |
| 5 | Phantom Shield (Payroll) | 0.2% (max $5) | **0.5% (max $10)** | 0.5% | 0.5% |
| 6 | Agent marketplace | 8% (800 bps) | **5% (500 bps)** | 5% | 5% |
| 7 | Arbitration penalty | 3% (max $10) | 3% (max $10) | 3% | 3% |
| 8 | Security Deposit discount | 0.5–3% | 0.5–3% | 0.5–3% | 0.5–3% |
| 9 | Premium sub | — | — | **$29/tháng** | $29/tháng |
| 10 | API access | — | — | **$0.01/call** | $0.01/call |
| 11 | White-label | — | — | — | **$500–5000/tháng** |

### Smart Contract Parameters cần thay đổi

| Contract | Function | Hiện tại | Đề xuất | Owner wallet |
|---|---|---|---|---|
| `NexusV2` | `setPlatformFee(uint256)` | 800 (8%) | **500 (5%)** | Treasury |
| `StreamV1` | `setPlatformFee(uint256)` | 800 (8%) | **500 (5%)** | Treasury |
| `SecurityDeposit` | Tier thresholds | 50/200/1000 | Giữ nguyên | — |

### Code Config cần thay đổi

| File | Biến | Hiện tại | Đề xuất |
|---|---|---|---|
| `fiat-onramp.ts` | `platformMarkupPercent` | 8 | **5** |
| `fiat-onramp.ts` | `platformFixedFee` (mới) | — | **1.00** |
| `fiat-onramp.ts` | `minAmount` | 5 | **5** (đã update) |
| `checkout/route.ts` | `SHIELD_FEE_PERCENT` | 0.2 | **0.5** |
| `checkout/route.ts` | `SHIELD_FEE_MAX` | 5 | **10** |
| `DealConfirmation.tsx` | `SHIELD_FEE_PERCENT` | 0.2 | **0.5** |
| `DealConfirmation.tsx` | `SHIELD_FEE_MAX` | 5 | **10** |
| `DealConfirmation.tsx` | `CARD_MARKUP_PERCENT` | 8 | **5** |
| `FiatCheckout.tsx` | `MARKUP_PERCENT` | 8 | **5** |
| `FiatCheckout.tsx` | `SHIELD_FEE_PERCENT` | 0.2 | **0.5** |
| `FiatCheckout.tsx` | `SHIELD_FEE_MAX` | 5 | **10** |
| `negotiation-engine.ts` | Platform fee multiplier | 0.08 | **0.05** |
| `page.tsx` (Payroll) | Shield fee | 0.002 | **0.005** |
| `page.tsx` (Payroll) | Shield max | $5 | **$10** |

---

<a id="projections"></a>
## DỰ PHÓNG DOANH THU TỔNG HỢP

```
                Phase 1          Phase 2          Phase 3
                (0-6 tháng)      (6-18 tháng)     (18+ tháng)
────────────────────────────────────────────────────────────────
Volume/tháng    $50,000          $500,000         $5,000,000
Users           1,000            10,000           100,000
────────────────────────────────────────────────────────────────
ENGINE 1 (B2B)  $95              $1,550           $31,500
ENGINE 2 (AI)   $750             $5,000           $25,000
ENGINE 3 (Trust) $50             $300             $2,000
ENGINE 4 (Fiat) $250             $3,450           $50,000
Subscription    —                $1,450           $14,500
API/SDK         —                $1,000           $25,000
────────────────────────────────────────────────────────────────
TỔNG/tháng      ~$1,100          ~$10,000         ~$118,000
TỔNG/năm        ~$13,200         ~$120,000        ~$1,416,000
────────────────────────────────────────────────────────────────
```

---

<a id="technical"></a>
## TRIỂN KHAI KỸ THUẬT

### Checklist Phase 1

**Off-chain (code update + deploy):**
```
□ apps/dashboard/app/lib/fiat-onramp.ts
  ├── platformMarkupPercent: 8 → 5
  ├── Thêm platformFixedFee: 1.00
  └── Cập nhật calculateMarkup() bao gồm fixed fee

□ apps/dashboard/app/api/fiat/checkout/route.ts
  ├── SHIELD_FEE_PERCENT: 0.2 → 0.5
  └── SHIELD_FEE_MAX: 5 → 10

□ apps/dashboard/app/components/omni/DealConfirmation.tsx
  ├── SHIELD_FEE_PERCENT: 0.2 → 0.5
  ├── SHIELD_FEE_MAX: 5 → 10
  └── CARD_MARKUP_PERCENT: 8 → 5

□ apps/dashboard/app/components/FiatCheckout.tsx
  ├── MARKUP_PERCENT: 8 → 5
  ├── SHIELD_FEE_PERCENT: 0.2 → 0.5
  └── SHIELD_FEE_MAX: 5 → 10

□ apps/dashboard/app/lib/negotiation-engine.ts
  └── platformFee: 0.08 → 0.05

□ apps/dashboard/app/page.tsx (Payroll)
  ├── Shield fee: 0.002 → 0.005
  └── Shield max: 5 → 10

□ UI: Fee breakdown hiển thị "5% + $1.00 processing fee"
□ UI: Shield ZK toggle hiển thị "0.5% fee (max $10)"
□ Deploy: docker compose -f docker-compose.prod.yml up -d --build dashboard
```

**On-chain (owner wallet transactions):**
```
□ NexusV2.setPlatformFee(500)
  Contract: 0x6A467Cd4156093bB528e448C04366586a1052Fab
  From: Owner wallet (treasury)

□ StreamV1.setPlatformFee(500)
  Contract: 0x4fE37c46E3D442129c2319de3D24c21A6cbfa36C
  From: Owner wallet (treasury)
```

### Tempo L1 Lưu ý Kỹ thuật

```
⚠️ Tempo sử dụng TIP-20 precompile tokens (địa chỉ 0x20c0...)
   — Gas cost cao hơn ERC20 chuẩn 5-6 lần
   — approve() ~276,000 gas (vs ~46,000 trên Ethereum)
   — transferFrom() ~350,000 gas
   — Cần gasLimit ≥ 800,000 cho approve, ≥ 1,500,000 cho deposit

⚠️ Tempo custom tx type 0x76 — ethers.js v6 không parse được receipt
   — Phải dùng raw HTTP RPC (fetch) thay vì provider.send()
   — Hàm verifyTxOnChain() trong fiat-onramp.ts xử lý vấn đề này

⚠️ Fee trên Tempo tính bằng stablecoin (không có native token)
   — eth_getBalance trả về giá trị placeholder vô nghĩa
   — Dùng balanceOf() trên TIP-20 contract để check số dư thực
```

---

## PHỤ LỤC: PHÂN TÍCH RỦI RO

| Rủi ro | Xác suất | Tác động | Biện pháp |
|---|---|---|---|
| User rời bỏ do tăng Shield fee (0.2→0.5%) | Thấp | Thấp | 0.5% vẫn rất rẻ; privacy có giá trị nhận thức cao |
| Margin gần 0 ở card txn lớn (>$400) | Trung bình | Trung bình | $1 fixed fee đảm bảo min profit; theo dõi và điều chỉnh |
| Agent marketplace 5% quá rẻ | Thấp | Tích cực | Thu hút nhiều agent hơn so với Fiverr 20%+ |
| Đối thủ copy mô hình | Trung bình | Trung bình | Hào phòng thủ = ZK tech + on-chain escrow + reputation |
| Paddle tăng phí | Thấp | Cao | Đàm phán rate tốt hơn ở volume cao; backup Stripe |
| Gian lận thẻ (chargebacks) | Trung bình | Cao | Paddle xử lý fraud detection; KYC ở giao dịch lớn |
| Smart contract exploit | Thấp | Rất cao | Audit code; max fee cap 30% on-chain; timelock upgrades |

---

*Tài liệu nội bộ Agentic Finance.*
*Được chuẩn bị cho đội ngũ sáng lập và nhà đầu tư chiến lược.*
*Mọi số liệu là ước tính dựa trên Paddle sandbox rate hiện tại.*
*Rate production Paddle có thể khác sau khi đàm phán volume.*
