# ANTIGRAVITY — Ứng dụng quản lý danh mục đầu tư

## Trạng thái ngày 02/10/2026

Gói này gồm mã nguồn để tiếp tục kiểm tra và báo cáo Word. Chưa phải bản production đã nghiệm thu trên máy khách.

- Frontend: 100/100 test đạt, 20 tệp; build production hoàn tất.
- Backend: 37/37 test đạt, 17 lớp.
- Bản chạy trước sửa: đăng nhập và đọc danh mục, holdings, giao dịch, watchlist, mục tiêu thành công; yêu cầu danh mục không xác thực trả 401.
- Backend sau sửa chưa chạy live được do cấu hình kết nối PostgreSQL. Chưa dựng lại lịch sử demo sau sửa.

## Các sửa đổi trong đợt này

1. Nhận các alias STOCK/STOCKS và BOND/BONDS khi phân loại tài sản.
2. Số lượng tài sản giữ tối đa 8 chữ số thập phân; 0,08 BTC không còn được làm tròn thành 0,1 trên các thành phần đã sửa.
3. Trạng thái phiên Market có HTML khởi tạo ổn định để tránh chênh lệch thời điểm build và hydration.
4. Theo lựa chọn của chủ sản phẩm: chỉ theo dõi tài sản đã mua. Snapshot tổng hợp vị thế còn lại, không trừ tiền mua vào tài khoản tiền mặt bắt đầu từ 0. Tiền bán không trở thành số dư tiền mặt.
5. Yêu cầu dựng lại lịch sử bằng API backfill chạy từ giao dịch đầu tiên, thay vì chỉ từ hôm nay. Job định kỳ vẫn giữ cơ chế hiện có.

Không sửa hoặc xóa giao dịch gốc để làm đẹp biểu đồ. Các snapshot cũ cần dựng lại sau khi backend mới chạy được.

## Chạy lại trên máy phát triển

Cần Java 17, Node.js phù hợp Next.js 15 và PostgreSQL. Maven Wrapper và lockfile npm nằm trong mã nguồn. Dùng một database thử riêng; không thử migration trực tiếp trên dữ liệu khách hàng. Một số migration cũ tạo lại bảng nên cần sao lưu và thử phục hồi trước nâng cấp.

Trong terminal backend, cấu hình qua biến môi trường:

```powershell
$env:SPRING_DATASOURCE_URL='jdbc:postgresql://127.0.0.1:5433/TEN_DATABASE_THU'
$env:SPRING_DATASOURCE_USERNAME='TAI_KHOAN_DATABASE'
# Nhập mật khẩu và khóa JWT vào môi trường một cách riêng tư.
# Các biến bắt buộc: SPRING_DATASOURCE_PASSWORD và SECURITY_JWT_SECRET.
$env:NEWS_INGESTION_ENABLED='false'
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run '-Dspring-boot.run.arguments=--server.port=8080'
```

Không mặc định rằng file `.env` được Maven tự nạp. Đợt kiểm tra có file `.env` chỉ chứa cấu hình JWT, chưa đủ cấu hình database cho backend mới.

Trong terminal frontend:

```powershell
npm ci
npm run test
$env:BACKEND_API_URL='http://127.0.0.1:8080'
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

`BACKEND_API_URL` cần đúng lúc build và start. Không dùng `NEXT_PUBLIC_API_BASE_URL` thay thế biến này. Các cấu hình Docker cũ chưa được nghiệm thu; không coi chúng là hướng cài đặt đã kiểm chứng.

## Các việc phải hoàn tất trước gửi bản nghiệm thu

- Chạy backend mới với đúng database và tài khoản kết nối, rồi đọc API qua frontend mới.
- Dựng lại snapshot trên tài khoản demo được phép; đối chiếu tổng giá vốn và giá trị từng ngày.
- Điều chỉnh/kiểm tra chỉ tiêu lịch sử khi có thêm hoặc rút tài sản. Tỷ lệ tăng tổng giá trị không tự là lợi nhuận; các chỉ tiêu rủi ro hiện chưa được nghiệm thu đầy đủ.
- Đối chiếu tổng hợp Ledger với Dashboard; chúng có phạm vi dữ liệu khác nhau trong ảnh kiểm tra.
- Chạy luồng tạo, sửa, xóa trên dữ liệu thử và kiểm tra chéo hai tài khoản.
- Kiểm tra cài mới, sao lưu/phục hồi, HTTPS, secrets, các nguồn giá và quyền sử dụng tài sản hình ảnh khi phân phối thương mại.
- Điền thông tin sinh viên/GVHD trong Word; nhận xét checkpoint phải do người có thẩm quyền xác nhận.

## Nội dung không đưa vào gói mã nguồn

Không bao gồm `.env`, khóa API, token, database, backups, log, tài khoản demo, lịch sử `.git`, node_modules hoặc thư mục build. Người nhận cài dependency và tự cấu hình bí mật. Không tự động đẩy mã lên GitHub hoặc gửi cho khách hàng trong đợt này.
