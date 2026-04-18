FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    binutils \
    libmagic1 \
    libmagic-dev \
    binwalk \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Volatility3
RUN pip install --no-cache-dir volatility3

COPY . .

# Create upload directory
RUN mkdir -p /tmp/forensix_uploads

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
