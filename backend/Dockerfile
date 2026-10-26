FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
# Satu worker saja — server staging RAM-nya kecil (dibagi dengan Odoo yang
# sudah aktif). Naikkan --workers kalau nanti pindah ke server dedicated.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
