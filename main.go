package main

import (
	"embed"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"runtime"
)

// assets フォルダの内容をバイナリに埋め込みます
//go:embed assets
var assets embed.FS

func main() {
	// 1. 空いているポートを自動で探してサーバーを起動
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		log.Fatal("サーバー起動エラー:", err)
	}
	defer ln.Close()

	// 割り当てられたポートからURLを作成
	port := ln.Addr().(*net.TCPAddr).Port
	url := fmt.Sprintf("http://127.0.0.1:%d", port)

	// assets フォルダをルートとして認識させる
	assetsFS, err := fs.Sub(assets, "assets")
	if err != nil {
		log.Fatal(err)
	}

	// サーバーをバックグラウンドで開始
	go http.Serve(ln, http.FileServer(http.FS(assetsFS)))

	// 2. ブラウザ（Edge または Chrome）のパスを取得
	browserPath := findBrowser()
	if browserPath == "" {
		fmt.Println("Chrome または Edge が見つかりませんでした。")
		fmt.Println("ブラウザで以下のURLを開いてください:", url)
		select {} 
	}

	// 3. 独立したウィンドウとして開くための設定
	tempDir, err := os.MkdirTemp("", "study-app-profile")
	if err != nil {
		log.Fatal(err)
	}
	defer os.RemoveAll(tempDir)

	// --app オプションで「アプリモード」として起動
	args := []string{
		"--app=" + url,
		"--user-data-dir=" + tempDir,
		"--window-size=1200,800",
	}

	fmt.Println("アプリを起動中...")
	cmd := exec.Command(browserPath, args...)
	
	// アプリが閉じられるまで待機
	if err := cmd.Run(); err != nil {
		log.Println("アプリ終了:", err)
	}
}

// OSごとにブラウザの実行ファイルを探す関数
func findBrowser() string {
	var paths []string

	switch runtime.GOOS {
	case "windows":
		paths = []string{
			os.Getenv("ProgramFiles(x86)") + "\\Microsoft\\Edge\\Application\\msedge.exe",
			os.Getenv("ProgramFiles") + "\\Microsoft\\Edge\\Application\\msedge.exe",
			os.Getenv("ProgramFiles(x86)") + "\\Google\\Chrome\\Application\\chrome.exe",
			os.Getenv("ProgramFiles") + "\\Google\\Chrome\\Application\\chrome.exe",
		}
	case "darwin":
		paths = []string{
			"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
			"/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
		}
	case "linux":
		paths = []string{"google-chrome", "microsoft-edge", "chromium"}
	}

	for _, p := range paths {
		if runtime.GOOS == "linux" {
			if path, err := exec.LookPath(p); err == nil {
				return path
			}
			continue
		}
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return ""
}