# Docker 설치 가이드 (WSL2 Ubuntu)

WSL2 환경에서 Docker를 사용하는 두 가지 방법이 있습니다.

## 방법 1: Docker Desktop for Windows 설치 (권장)

가장 간단하고 권장되는 방법입니다.

### 설치 단계

1. **Docker Desktop 다운로드**
   - https://www.docker.com/products/docker-desktop 접속
   - "Download for Windows" 클릭

2. **설치 실행**
   - 다운로드한 `Docker Desktop Installer.exe` 실행
   - "Use WSL 2 instead of Hyper-V" 옵션 체크
   - 설치 완료 후 재부팅

3. **WSL2 통합 활성화**
   - Docker Desktop 실행
   - Settings → Resources → WSL Integration
   - "Enable integration with my default WSL distro" 체크
   - Ubuntu 배포판 활성화
   - "Apply & Restart" 클릭

4. **설치 확인**
   ```bash
   docker --version
   docker compose version
   ```

### 장점
- GUI 제공으로 관리가 쉬움
- WSL2와 자동 통합
- Windows와 WSL2 모두에서 사용 가능
- 업데이트 자동 관리

---

## 방법 2: WSL2 내에서 Docker Engine 직접 설치

### 1. 기존 Docker 패키지 제거 (있다면)

```bash
sudo apt-get remove docker docker-engine docker.io containerd runc
```

### 2. 필수 패키지 설치

```bash
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release
```

### 3. Docker GPG 키 추가

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
```

### 4. Docker 저장소 추가

```bash
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

### 5. Docker Engine 설치

```bash
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
```

### 6. Docker 서비스 시작

```bash
# systemd가 활성화되어 있다면
sudo systemctl start docker
sudo systemctl enable docker

# systemd가 없다면 (WSL2 구버전)
sudo service docker start
```

### 7. 사용자를 docker 그룹에 추가 (sudo 없이 사용)

```bash
sudo usermod -aG docker $USER
# 터미널 재시작 후 적용됨
```

### 8. 설치 확인

```bash
docker --version
docker compose version
docker run hello-world
```

---

## WSL2에서 systemd 활성화 (필요시)

WSL2에서 systemd를 사용하려면:

1. `/etc/wsl.conf` 파일 생성/수정:
   ```bash
   sudo nano /etc/wsl.conf
   ```

2. 다음 내용 추가:
   ```ini
   [boot]
   systemd=true
   ```

3. WSL 재시작 (Windows PowerShell에서):
   ```powershell
   wsl --shutdown
   ```

4. WSL2 다시 시작

---

## 문제 해결

### "Cannot connect to the Docker daemon" 오류

**원인**: Docker 서비스가 실행되지 않음

**해결**:
```bash
# systemd 사용
sudo systemctl start docker

# service 명령 사용
sudo service docker start
```

### "permission denied" 오류

**원인**: docker 그룹에 사용자가 추가되지 않음

**해결**:
```bash
sudo usermod -aG docker $USER
# 로그아웃 후 다시 로그인하거나 터미널 재시작
newgrp docker
```

### Docker Desktop이 WSL2를 인식하지 못함

**해결**:
1. Docker Desktop Settings → General
2. "Use the WSL 2 based engine" 체크 확인
3. Settings → Resources → WSL Integration
4. Ubuntu 배포판 활성화
5. "Apply & Restart"

---

## E2E 테스트 실행

Docker가 정상적으로 설치되면:

```bash
# 1. 테스트 데이터베이스 시작
docker compose up -d

# 2. 컨테이너 상태 확인
docker compose ps

# 3. E2E 테스트 실행
npm run test:e2e

# 4. 테스트 완료 후 정리
docker compose down

# 데이터까지 모두 삭제
docker compose down -v
```

---

## 권장사항

**WSL2 사용자에게는 Docker Desktop for Windows 설치를 강력히 권장합니다.**

- 설치가 간단함
- GUI로 관리 편리
- Windows와 WSL2 통합 지원
- 자동 업데이트
- 컨테이너 모니터링 기능
