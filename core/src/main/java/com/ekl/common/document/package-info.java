/**
 * 문서함의 문서 기능. 문서, 문서 버전과 게시를 관리한다.
 *
 * <p>다른 모듈과 컨트롤러는 공개 Service를 호출한다. Service는 권한과 트랜잭션 경계를
 * 관리하고 문서 BLO에 업무 규칙을 위임한다. BLO와 DAO는 문서 기능 내부에서 사용한다.</p>
 */
package com.ekl.common.document;
