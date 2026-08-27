package com.macro.mall.gateway.util;

import lombok.extern.slf4j.Slf4j;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * CIDR 匹配器
 * <p>基于位运算判断 IP 是否在给定的 CIDR 子网中（兼容 IPv4）。</p>
 *
 * @author mall-gateway team
 */
@Slf4j
public final class CidrMatcher {

    private CidrMatcher() {
    }

    /**
     * 判断某个 IP 是否匹配指定的 CIDR/单 IP 列表
     *
     * @param ip   待验证的 IP（字符串，例如 "192.168.1.100"）
     * @param list CIDR 列表，例如 ["192.168.1.0/24", "10.0.0.1"]
     * @return true = 命中任意一条
     */
    public static boolean matchAny(String ip, List<String> list) {
        if (ip == null || list == null || list.isEmpty()) {
            return false;
        }
        try {
            int ipInt = toInt(InetAddress.getByName(ip));
            List<Rule> rules = parseRules(list);
            for (Rule rule : rules) {
                if (rule.matches(ipInt)) {
                    return true;
                }
            }
        } catch (UnknownHostException ex) {
            log.debug("CIDR 匹配失败（非法 IP：{}）", ip);
        }
        return false;
    }

    private static List<Rule> parseRules(List<String> list) {
        if (list.isEmpty()) {
            return Collections.emptyList();
        }
        List<Rule> rules = new ArrayList<>(list.size());
        for (String raw : list) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            try {
                rules.add(Rule.parse(raw.trim()));
            } catch (Exception ex) {
                log.warn("忽略非法 CIDR 规则: {}", raw);
            }
        }
        return rules;
    }

    private static int toInt(InetAddress inet) {
        byte[] bytes = inet.getAddress();
        int value = 0;
        for (byte b : bytes) {
            value = (value << 8) | (b & 0xff);
        }
        return value;
    }

    private static final class Rule {
        final int network;
        final int mask;

        Rule(int network, int maskBits) {
            // 用无符号的移位构造掩码（maskBits ∈ [0,32]）
            int bits = Math.max(0, Math.min(32, maskBits));
            this.mask = bits == 0 ? 0 : (int) (0xffffffffL << (32 - bits));
            this.network = network & this.mask;
        }

        static Rule parse(String cidr) throws UnknownHostException {
            String[] parts = cidr.split("/");
            int ipInt = toInt(InetAddress.getByName(parts[0].trim()));
            int bits = parts.length == 2 ? Integer.parseInt(parts[1].trim()) : 32;
            return new Rule(ipInt, bits);
        }

        boolean matches(int ipInt) {
            return (ipInt & mask) == network;
        }
    }
}
