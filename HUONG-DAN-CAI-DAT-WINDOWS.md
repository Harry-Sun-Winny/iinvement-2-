# Cài đặt ANTIGRAVITY trên máy Windows khác

Đây là ứng dụng web chạy **trên máy của bạn**, không phải chương trình `.exe` độc lập. Máy cần Windows 10/11 64-bit, WSL 2, Docker Desktop (Linux containers), kết nối Internet cho lần cài đầu, và khoảng 8 GB RAM trở lên. Cài Docker Desktop từ trang chính thức của Docker, mở ứng dụng và đợi engine khởi động.

1. Giải nén **toàn bộ** gói `ANTIGRAVITY-Windows-Setup.zip` vào một thư mục còn chỗ trống; không chạy script bên trong ZIP.
2. Nhấp đúp `INSTALL-WINDOWS.cmd` trong thư mục vừa giải nén. Windows có thể hỏi xác nhận chạy script tải và khởi động Docker. Chỉ chạy gói tải từ kho bạn tin cậy.
3. Lần đầu Docker tải image và biên dịch ứng dụng nên có thể mất vài phút. Khi hoàn tất, mở `http://localhost:3002` trên chính máy cài đặt. Tạo tài khoản trong ứng dụng để bắt đầu.
4. Những lần sau mở Docker Desktop rồi nhấp đúp `START-WINDOWS.cmd`. Để dừng, nhấp đúp `STOP-WINDOWS.cmd`.

Script tạo `.env` với mật khẩu database/JWT ngẫu nhiên. **Giữ kín và sao lưu file này**; không đưa lên GitHub. Dữ liệu danh mục và tệp nhật ký nằm trong Docker volumes. Lệnh Stop không xóa dữ liệu. Không dùng `docker compose down -v` trừ khi thực sự muốn xóa dữ liệu. Nếu chuyển máy, cần sao lưu cả Docker volumes và `.env`; ZIP nguồn không chứa dữ liệu của bạn.

App chỉ mở trên `localhost`, không tự công khai lên Internet. API dữ liệu thị trường/AI có thể cần khóa `FMP_API_KEY`, `FINNHUB_API_KEY`, `OPENAI_API_KEY` trong `.env` và Internet; để trống thì các chức năng tương ứng có thể hạn chế. Đây là công cụ theo dõi danh mục, không giao dịch chứng khoán và không đưa ra cam kết lợi nhuận.

Nếu cài đặt lỗi, xem `docker compose -f compose.install.yml ps` và `docker compose -f compose.install.yml logs --tail=100`. Docker Desktop cần chạy trong suốt thời gian dùng app.
