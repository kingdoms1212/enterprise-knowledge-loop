package com.ekl.framework.dao;

import java.util.Map;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.simple.JdbcClient;

public abstract class BaseDao<T> {
    private final JdbcClient jdbc;

    protected BaseDao(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    protected Optional<T> queryOne(String sql, Map<String, ?> parameters, RowMapper<T> mapper) {
        return jdbc.sql(sql).params(parameters).query(mapper).optional();
    }

    protected List<T> queryList(String sql, Map<String, ?> parameters, RowMapper<T> mapper) {
        return jdbc.sql(sql).params(parameters).query(mapper).list();
    }
}
