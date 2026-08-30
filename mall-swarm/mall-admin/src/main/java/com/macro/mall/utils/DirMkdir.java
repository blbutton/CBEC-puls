package com.macro.mall.utils;

import java.io.IOException;
import java.io.InputStream;

/**
 * 目录创建工具，加固防命令注入、跨平台支持
 */
public class DirMkdir {

    /**
     * 构造器
     * @param username 用户名，用于生成目录名
     * @throws IOException IO异常
     */
    public void dirMkdir(String username) throws IOException {
        // 参数校验
        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("username不能为空");
        }
        DirMkdir.madir(username);
    }

    /**
     * 创建目录，Runtime.exec数组方式，禁止shell字符串拼接，防御命令注入
     * @param username 目录名称/用户名
     * @throws IOException 执行异常
     */
    public static void madir(String username) throws IOException {
        // 【防御】简单过滤非法目录字符，避免路径遍历
        if (username.contains("..") || username.contains("/") || username.contains("\\")) {
            throw new IllegalArgumentException("非法用户名，禁止路径遍历字符");
        }

        String[] cmdArray;
        // 判断操作系统，构造不同命令数组，数组形式exec不会经过shell解析，杜绝命令注入
        if (isWindows()) {
            // Windows md 自动创建多级，不需要-p；cmd /c 执行
            cmdArray = new String[]{"cmd", "/c", "md", username};
        } else {
            // Linux/mac mkdir -p
            cmdArray = new String[]{"mkdir", "-p", username};
        }

        // 使用数组参数exec！！不要传字符串，防止shell注入
        Process process = Runtime.getRuntime().exec(cmdArray);

        // 消费输出流，防止缓冲区阻塞进程卡死
        consumeStream(process.getInputStream());
        consumeStream(process.getErrorStream());

        try {
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new IOException("创建目录失败，退出码:" + exitCode + "，目录名:" + username);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("创建目录被中断", e);
        }
    }

    /**
     * 消费进程输出流，防止缓冲区满挂起
     */
    private static void consumeStream(InputStream is) throws IOException {
        byte[] buf = new byte[1024];
        while (is.read(buf) != -1) {
            // 丢弃输出，业务需要可以打印日志
        }
        is.close();
    }

    /**
     * 判断是否Windows系统
     */
    private static boolean isWindows() {
        return System.getProperty("os.name").toLowerCase().contains("win");
    }
}